import { Router, Request, Response } from 'express';
import { getSqliteDb } from '../database';
import Stripe from 'stripe';
import twilio from 'twilio';

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2022-11-15',
});

// Initialize Twilio client only if credentials are properly configured
let twilioClient: any = null;
try {
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  }
} catch (error) {
  console.warn('Twilio client initialization failed:', error);
  twilioClient = null;
}

// Create a new payment
router.post('/', async (req: Request, res: Response) => {
  try {
    const { amount, currency, merchantId, customerId, description } = req.body;
    const db = getSqliteDb();

    // Validate required fields
    if (!amount || !currency || !merchantId || !customerId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: amount, currency, merchantId, customerId' 
      });
    }

    // Check network status
    const networkStatus = await db.get('SELECT is_online FROM network_status ORDER BY last_checked DESC LIMIT 1');
    
    if (networkStatus?.is_online) {
      // Process payment online
      try {
        const payment = await stripe.paymentIntents.create({
          amount,
          currency,
          customer: customerId,
          description: description || `Payment to ${merchantId}`,
          metadata: {
            merchantId,
            customerId,
          },
        });

        // Store successful payment in database
        await db.run(
          `INSERT INTO offline_payments (amount, currency, merchant_id, customer_id, status, description)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [amount, currency, merchantId, customerId, 'completed', description]
        );

        // Send SMS confirmation
        try {
          if (twilioClient) {
            await twilioClient.messages.create({
              body: `Payment of ${(amount/100).toFixed(2)} ${currency} processed successfully. Transaction ID: ${payment.id}`,
              to: process.env.MERCHANT_PHONE || '',
              from: process.env.TWILIO_PHONE || '',
            });
          }
        } catch (smsError) {
          console.error('SMS sending failed:', smsError);
          // Don't fail the payment if SMS fails
        }

        return res.json({ 
          success: true, 
          payment,
          message: 'Payment processed successfully'
        });
      } catch (stripeError) {
        console.error('Stripe payment failed:', stripeError);
        
        // If Stripe fails, queue the payment for retry
        const result = await db.run(
          `INSERT INTO offline_payments (amount, currency, merchant_id, customer_id, status, description, retry_count)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [amount, currency, merchantId, customerId, 'pending', description, 1]
        );

        return res.json({
          success: true,
          message: 'Payment queued for retry due to processing error',
          paymentId: result.lastID,
        });
      }
    } else {
      // Store payment offline
      const result = await db.run(
        `INSERT INTO offline_payments (amount, currency, merchant_id, customer_id, status, description)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [amount, currency, merchantId, customerId, 'pending', description]
      );

      return res.json({
        success: true,
        message: 'Payment queued for offline processing',
        paymentId: result.lastID,
      });
    }
  } catch (error) {
    console.error('Payment processing error:', error);
    res.status(500).json({ success: false, error: 'Payment processing failed' });
  }
});

// Get payment status
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const db = getSqliteDb();
    const payment = await db.get(
      'SELECT * FROM offline_payments WHERE id = ?',
      [req.params.id]
    );

    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }

    res.json({ success: true, payment });
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch payment' });
  }
});

// Get all payments
router.get('/', async (req: Request, res: Response) => {
  try {
    const db = getSqliteDb();
    const payments = await db.all(
      'SELECT * FROM offline_payments ORDER BY created_at DESC LIMIT 100'
    );

    res.json({ success: true, payments });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch payments' });
  }
});

// Sync offline payments with exponential backoff
router.post('/sync', async (req: Request, res: Response) => {
  try {
    const db = getSqliteDb();
    const pendingPayments = await db.all(
      'SELECT * FROM offline_payments WHERE status = ? AND retry_count < ?',
      ['pending', 5] // Increased max retries
    );

    const results = await Promise.all(
      pendingPayments.map(async (payment: any) => {
        try {
          // Exponential backoff delay
          const delay = Math.pow(2, payment.retry_count) * 1000; // 1s, 2s, 4s, 8s, 16s
          await new Promise(resolve => setTimeout(resolve, delay));

          const stripePayment = await stripe.paymentIntents.create({
            amount: payment.amount,
            currency: payment.currency,
            customer: payment.customer_id,
            description: payment.description || `Payment to ${payment.merchant_id}`,
            metadata: {
              merchantId: payment.merchant_id,
              customerId: payment.customer_id,
              originalPaymentId: payment.id.toString(),
            },
          });

          // Update payment status
          await db.run(
            `UPDATE offline_payments 
             SET status = ?, synced_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            ['completed', payment.id]
          );

          // Send SMS confirmation
          try {
            if (twilioClient) {
              await twilioClient.messages.create({
                body: `Offline payment of ${(payment.amount/100).toFixed(2)} ${payment.currency} processed successfully. Transaction ID: ${stripePayment.id}`,
                to: process.env.MERCHANT_PHONE || '',
                from: process.env.TWILIO_PHONE || '',
              });
            }
          } catch (smsError) {
            console.error('SMS sending failed:', smsError);
          }

          return { success: true, paymentId: payment.id, stripePaymentId: stripePayment.id };
        } catch (error) {
          console.error(`Payment ${payment.id} sync failed:`, error);
          
          // Increment retry count
          await db.run(
            'UPDATE offline_payments SET retry_count = retry_count + 1 WHERE id = ?',
            [payment.id]
          );

          // If max retries reached, send fallback SMS
          if (payment.retry_count >= 4) {
            try {
              if (twilioClient) {
                await twilioClient.messages.create({
                  body: `CRITICAL: Payment of ${(payment.amount/100).toFixed(2)} ${payment.currency} failed after ${payment.retry_count + 1} attempts. Manual intervention required. Payment ID: ${payment.id}`,
                  to: process.env.MERCHANT_PHONE || '',
                  from: process.env.TWILIO_PHONE || '',
                });
                
                // Mark as failed
                await db.run(
                  'UPDATE offline_payments SET status = ? WHERE id = ?',
                  ['failed', payment.id]
                );
              }
            } catch (smsError) {
              console.error('Fallback SMS failed:', smsError);
            }
          }

          return { success: false, paymentId: payment.id, error: error instanceof Error ? error.message : 'Unknown error' };
        }
      })
    );

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    res.json({ 
      success: true, 
      results,
      summary: {
        total: results.length,
        successful,
        failed
      }
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ success: false, error: 'Sync failed' });
  }
});

// Manual retry for failed payments
router.post('/:id/retry', async (req: Request, res: Response) => {
  try {
    const db = getSqliteDb();
    const payment = await db.get(
      'SELECT * FROM offline_payments WHERE id = ?',
      [req.params.id]
    );

    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }

    if (payment.status === 'completed') {
      return res.status(400).json({ success: false, error: 'Payment already completed' });
    }

    // Reset retry count and status
    await db.run(
      'UPDATE offline_payments SET status = ?, retry_count = 0 WHERE id = ?',
      ['pending', payment.id]
    );

    res.json({ success: true, message: 'Payment queued for retry' });
  } catch (error) {
    console.error('Retry error:', error);
    res.status(500).json({ success: false, error: 'Retry failed' });
  }
});

export const paymentRoutes = router; 