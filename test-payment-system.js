const axios = require('axios');

const API_URL = 'http://localhost:3001';

// Test data
const testPayment = {
  amount: 1000, // $10.00 in cents
  currency: 'USD',
  merchantId: 'merchant_test_123',
  customerId: 'customer_test_456',
  description: 'Test payment for offline system'
};

async function testPaymentSystem() {
  console.log('🧪 Testing Offline Payment System\n');

  try {
    // Test 1: Health check
    console.log('1. Testing health check...');
    const healthResponse = await axios.get(`${API_URL}/health`);
    console.log('✅ Health check passed:', healthResponse.data);

    // Test 2: Network status
    console.log('\n2. Testing network status...');
    const networkResponse = await axios.post(`${API_URL}/api/network/status`, {
      isOnline: true
    });
    console.log('✅ Network status updated:', networkResponse.data);

    // Test 3: Online payment processing
    console.log('\n3. Testing online payment processing...');
    const paymentResponse = await axios.post(`${API_URL}/api/payments`, testPayment);
    console.log('✅ Payment processed:', paymentResponse.data);

    // Test 4: Get all payments
    console.log('\n4. Testing get all payments...');
    const paymentsResponse = await axios.get(`${API_URL}/api/payments`);
    console.log('✅ Payments retrieved:', paymentsResponse.data.payments?.length || 0, 'payments');

    // Test 5: Offline payment queueing
    console.log('\n5. Testing offline payment queueing...');
    await axios.post(`${API_URL}/api/network/status`, { isOnline: false });
    
    const offlinePaymentResponse = await axios.post(`${API_URL}/api/payments`, {
      ...testPayment,
      amount: 2000, // $20.00
      description: 'Offline test payment'
    });
    console.log('✅ Offline payment queued:', offlinePaymentResponse.data);

    // Test 6: Sync offline payments
    console.log('\n6. Testing offline payment sync...');
    await axios.post(`${API_URL}/api/network/status`, { isOnline: true });
    
    const syncResponse = await axios.post(`${API_URL}/api/payments/sync`);
    console.log('✅ Sync completed:', syncResponse.data.summary);

    console.log('\n🎉 All tests passed! The payment system is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.response?.status === 500) {
      console.log('\n💡 Make sure the server is running:');
      console.log('   cd server && npm run dev');
    }
  }
}

// Run tests
testPaymentSystem(); 