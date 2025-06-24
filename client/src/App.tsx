import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Wifi,
  WifiOff,
  Payment,
  Sync,
  CheckCircle,
  Error,
  Schedule,
  Visibility,
} from '@mui/icons-material';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

interface PaymentForm {
  amount: string;
  currency: string;
  merchantId: string;
  customerId: string;
  description: string;
}

interface QueuedPayment {
  id: string;
  amount: number;
  currency: string;
  merchantId: string;
  customerId: string;
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  retryCount: number;
}

function App() {
  const [formData, setFormData] = useState<PaymentForm>({
    amount: '',
    currency: 'USD',
    merchantId: '',
    customerId: '',
    description: '',
  });
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [networkStrength, setNetworkStrength] = useState<number>(100);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [queuedPayments, setQueuedPayments] = useState<QueuedPayment[]>([]);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [showQueueDialog, setShowQueueDialog] = useState<boolean>(false);
  const [selectedPayment, setSelectedPayment] = useState<QueuedPayment | null>(null);

  // Load queued payments from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('queuedPayments');
    if (saved) {
      setQueuedPayments(JSON.parse(saved));
    }
  }, []);

  // Save queued payments to localStorage
  useEffect(() => {
    localStorage.setItem('queuedPayments', JSON.stringify(queuedPayments));
  }, [queuedPayments]);

  // Network detection and monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      updateNetworkStatus(true);
      syncQueuedPayments();
    };

    const handleOffline = () => {
      setIsOnline(false);
      updateNetworkStatus(false);
    };

    const checkNetworkStrength = async () => {
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        if (connection.effectiveType) {
          const strengthMap: { [key: string]: number } = {
            'slow-2g': 20,
            '2g': 40,
            '3g': 60,
            '4g': 80,
            '5g': 100,
          };
          setNetworkStrength(strengthMap[connection.effectiveType] || 100);
        }
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Check network strength periodically
    const interval = setInterval(checkNetworkStrength, 5000);
    checkNetworkStrength();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const updateNetworkStatus = async (status: boolean) => {
    try {
      await axios.post(`${API_URL}/api/network/status`, { isOnline: status });
    } catch (error) {
      console.error('Failed to update network status:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const addToQueue = (payment: Omit<QueuedPayment, 'id' | 'status' | 'createdAt' | 'retryCount'>) => {
    const queuedPayment: QueuedPayment = {
      ...payment,
      id: Date.now().toString(),
      status: 'pending',
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };
    setQueuedPayments(prev => [...prev, queuedPayment]);
    return queuedPayment;
  };

  const updatePaymentStatus = (id: string, status: QueuedPayment['status']) => {
    setQueuedPayments(prev => 
      prev.map(payment => 
        payment.id === id ? { ...payment, status } : payment
      )
    );
  };

  const syncQueuedPayments = async () => {
    if (!isOnline || queuedPayments.length === 0) return;

    setSyncing(true);
    const pendingPayments = queuedPayments.filter(p => p.status === 'pending');

    for (const payment of pendingPayments) {
      try {
        updatePaymentStatus(payment.id, 'processing');
        
        const response = await axios.post(`${API_URL}/api/payments`, {
          amount: payment.amount,
          currency: payment.currency,
          merchantId: payment.merchantId,
          customerId: payment.customerId,
          description: payment.description,
        });

        if (response.data.success) {
          updatePaymentStatus(payment.id, 'completed');
        } else {
          updatePaymentStatus(payment.id, 'failed');
        }
      } catch (error) {
        console.error('Failed to sync payment:', error);
        updatePaymentStatus(payment.id, 'failed');
      }
    }

    setSyncing(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const paymentData = {
      amount: parseFloat(formData.amount) * 100, // Convert to cents
      currency: formData.currency,
      merchantId: formData.merchantId,
      customerId: formData.customerId,
      description: formData.description,
    };

    try {
      if (isOnline && networkStrength > 30) {
        // Process payment online
        const response = await axios.post(`${API_URL}/api/payments`, paymentData);

        if (response.data.success) {
          setSuccess('Payment processed successfully!');
          setFormData({
            amount: '',
            currency: 'USD',
            merchantId: '',
            customerId: '',
            description: '',
          });
        }
      } else {
        // Queue payment for offline processing
        const queuedPayment = addToQueue(paymentData);
        setSuccess(`Payment queued for offline processing. Queue ID: ${queuedPayment.id}`);
        setFormData({
          amount: '',
          currency: 'USD',
          merchantId: '',
          customerId: '',
          description: '',
        });
      }
    } catch (error) {
      // If online payment fails, queue it
      const queuedPayment = addToQueue(paymentData);
      setSuccess(`Payment queued due to processing error. Queue ID: ${queuedPayment.id}`);
      setFormData({
        amount: '',
        currency: 'USD',
        merchantId: '',
        customerId: '',
        description: '',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: QueuedPayment['status']) => {
    switch (status) {
      case 'completed': return 'success';
      case 'failed': return 'error';
      case 'processing': return 'warning';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: QueuedPayment['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle />;
      case 'failed': return <Error />;
      case 'processing': return <Sync />;
      default: return <Schedule />;
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom align="center">
          Offline Payment System
        </Typography>

        <Grid container spacing={3}>
          {/* Network Status Card */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  {isOnline ? <Wifi color="success" /> : <WifiOff color="error" />}
                  <Typography variant="h6" ml={1}>
                    Network Status
                  </Typography>
                </Box>
                <Alert severity={isOnline ? 'success' : 'warning'} sx={{ mb: 2 }}>
                  {isOnline ? 'Online Mode' : 'Offline Mode'}
                </Alert>
                <Typography variant="body2" color="textSecondary">
                  Signal Strength: {networkStrength}%
                </Typography>
                {queuedPayments.length > 0 && (
                  <Button
                    variant="outlined"
                    startIcon={<Sync />}
                    onClick={syncQueuedPayments}
                    disabled={syncing || !isOnline}
                    sx={{ mt: 2 }}
                    fullWidth
                  >
                    {syncing ? 'Syncing...' : `Sync ${queuedPayments.filter(p => p.status === 'pending').length} Payments`}
                  </Button>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Payment Form Card */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  <Payment sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Payment Form
                </Typography>

                <form onSubmit={handleSubmit}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Amount"
                        name="amount"
                        type="number"
                        value={formData.amount}
                        onChange={handleInputChange}
                        required
                        inputProps={{ min: 0, step: 0.01 }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Currency"
                        name="currency"
                        value={formData.currency}
                        onChange={handleInputChange}
                        required
                        select
                        SelectProps={{ native: true }}
                      >
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                        <option value="INR">INR</option>
                      </TextField>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Merchant ID"
                        name="merchantId"
                        value={formData.merchantId}
                        onChange={handleInputChange}
                        required
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Customer ID"
                        name="customerId"
                        value={formData.customerId}
                        onChange={handleInputChange}
                        required
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Description"
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        multiline
                        rows={2}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Button
                        type="submit"
                        variant="contained"
                        color="primary"
                        fullWidth
                        disabled={loading}
                        size="large"
                      >
                        {loading ? <CircularProgress size={24} /> : 'Process Payment'}
                      </Button>
                    </Grid>
                  </Grid>
                </form>

                {error && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {error}
                  </Alert>
                )}

                {success && (
                  <Alert severity="success" sx={{ mt: 2 }}>
                    {success}
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Queued Payments Card */}
          {queuedPayments.length > 0 && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h5">
                      Queued Payments ({queuedPayments.length})
                    </Typography>
                    <Button
                      variant="outlined"
                      onClick={() => setShowQueueDialog(true)}
                    >
                      View Details
                    </Button>
                  </Box>
                  
                  <Grid container spacing={2}>
                    {queuedPayments.slice(0, 3).map((payment) => (
                      <Grid item xs={12} sm={4} key={payment.id}>
                        <Paper sx={{ p: 2 }}>
                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Typography variant="h6">
                              ${(payment.amount / 100).toFixed(2)} {payment.currency}
                            </Typography>
                            <Chip
                              icon={getStatusIcon(payment.status)}
                              label={payment.status}
                              color={getStatusColor(payment.status) as any}
                              size="small"
                            />
                          </Box>
                          <Typography variant="body2" color="textSecondary">
                            {payment.description}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {new Date(payment.createdAt).toLocaleString()}
                          </Typography>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      </Box>

      {/* Queue Details Dialog */}
      <Dialog
        open={showQueueDialog}
        onClose={() => setShowQueueDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Queued Payments Details</DialogTitle>
        <DialogContent>
          <List>
            {queuedPayments.map((payment) => (
              <ListItem key={payment.id} divider>
                <ListItemText
                  primary={`$${(payment.amount / 100).toFixed(2)} ${payment.currency} - ${payment.description}`}
                  secondary={`Merchant: ${payment.merchantId} | Customer: ${payment.customerId} | Created: ${new Date(payment.createdAt).toLocaleString()}`}
                />
                <ListItemSecondaryAction>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Chip
                      icon={getStatusIcon(payment.status)}
                      label={payment.status}
                      color={getStatusColor(payment.status) as any}
                      size="small"
                    />
                    <IconButton
                      size="small"
                      onClick={() => setSelectedPayment(payment)}
                    >
                      <Visibility />
                    </IconButton>
                  </Box>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowQueueDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Payment Details Dialog */}
      <Dialog
        open={!!selectedPayment}
        onClose={() => setSelectedPayment(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Payment Details</DialogTitle>
        <DialogContent>
          {selectedPayment && (
            <Box>
              <Typography variant="h6" gutterBottom>
                ${(selectedPayment.amount / 100).toFixed(2)} {selectedPayment.currency}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Description:</strong> {selectedPayment.description}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Merchant ID:</strong> {selectedPayment.merchantId}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Customer ID:</strong> {selectedPayment.customerId}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Status:</strong> {selectedPayment.status}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Created:</strong> {new Date(selectedPayment.createdAt).toLocaleString()}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Retry Count:</strong> {selectedPayment.retryCount}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedPayment(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Success/Error Snackbar */}
      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={() => setSuccess('')}
      >
        <Alert severity="success" onClose={() => setSuccess('')}>
          {success}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default App;
