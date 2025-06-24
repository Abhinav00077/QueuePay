import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { setupDatabase } from './database';
import { paymentRoutes } from './routes/payments';
import { networkRoutes } from './routes/network';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/payments', paymentRoutes);
app.use('/api/network', networkRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Initialize database and start server
async function startServer() {
  try {
    await setupDatabase();
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer(); 