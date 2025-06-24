# QueuePay - Offline Payment System

A robust payment processing system designed for areas with poor network connectivity. QueuePay automatically detects weak signals, queues payments offline, and processes them when connectivity is restored with intelligent retry mechanisms and SMS fallback notifications.

## 🚀 Features

### Core Functionality
- **Real-time Network Monitoring**: Continuously monitors network connectivity status
- **Offline Payment Queuing**: Automatically queues payments when offline
- **Auto-Sync**: Processes queued payments when back online
- **Exponential Backoff Retry**: Intelligent retry mechanism with increasing delays
- **SMS Fallback**: Twilio integration for payment confirmations and alerts
- **Background Sync**: Service worker for seamless offline-to-online transitions

### Technical Features
- **React Frontend**: Modern UI with Material-UI components
- **Node.js/Express Backend**: RESTful API with TypeScript
- **SQLite Database**: Local storage for offline payments
- **Stripe Integration**: Secure payment processing
- **Docker Support**: Containerized deployment
- **Nginx Configuration**: Production-ready reverse proxy

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Client  │    │  Express Server │    │   SQLite DB     │
│   (Port 3000)   │◄──►│   (Port 3001)   │◄──►│  (Local File)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Service Worker │    │   Stripe API    │    │   Twilio SMS    │
│ (Offline Cache) │    │ (Payments)      │    │ (Notifications) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Material-UI v5** - Component library
- **Axios** - HTTP client
- **Service Worker** - Offline support

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **SQLite3** - Local database
- **Stripe** - Payment processing
- **Twilio** - SMS notifications

### DevOps
- **Docker** - Containerization
- **Nginx** - Reverse proxy
- **Docker Compose** - Multi-container orchestration

## 📦 Installation

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Git

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/QueuePay.git
   cd QueuePay
   ```

2. **Install dependencies**
   ```bash
   # Install server dependencies
   cd server && npm install
   
   # Install client dependencies
   cd ../client && npm install
   ```

3. **Environment Setup**
   
   Create `.env` files in both `server/` and `client/` directories:
   
   **Server (.env)**
   ```env
   PORT=3001
   STRIPE_SECRET_KEY=sk_test_your_stripe_key
   TWILIO_ACCOUNT_SID=ACyour_twilio_sid
   TWILIO_AUTH_TOKEN=your_twilio_token
   TWILIO_PHONE=+1234567890
   MERCHANT_PHONE=+1234567890
   ```
   
   **Client (.env)**
   ```env
   REACT_APP_API_URL=http://localhost:3001
   REACT_APP_STRIPE_PUBLIC_KEY=pk_test_your_stripe_key
   ```

4. **Start the application**
   ```bash
   # Start backend (from server directory)
   cd server && npm run dev
   
   # Start frontend (from client directory)
   cd client && npm start
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - Health Check: http://localhost:3001/health

## 🐳 Docker Deployment

### Using Docker Compose
```bash
# Build and start all services
docker-compose up --build

# Run in background
docker-compose up -d --build
```

### Manual Docker Build
```bash
# Build server image
docker build -f Dockerfile.server -t queuepay-server .

# Build client image
docker build -f Dockerfile.client -t queuepay-client .

# Run containers
docker run -p 3001:3001 queuepay-server
docker run -p 3000:3000 queuepay-client
```

## 🔧 API Endpoints

### Payment Routes (`/api/payments`)
- `POST /` - Create new payment
- `GET /` - Get all payments
- `GET /:id` - Get payment by ID
- `POST /sync` - Sync offline payments

### Network Routes (`/api/network`)
- `GET /status` - Get current network status
- `POST /status` - Update network status

### Health Check
- `GET /health` - Server health status

## 🧪 Testing

### Manual Testing
1. **Network Simulation**: Use browser dev tools to simulate offline mode
2. **Payment Flow**: Create payments in offline mode, then go online
3. **Retry Logic**: Monitor console for retry attempts
4. **SMS Notifications**: Check Twilio logs for SMS delivery

### Automated Testing
```bash
# Run server tests
cd server && npm test

# Run client tests
cd client && npm test
```

## 📱 Usage

### Payment Processing
1. **Online Mode**: Payments are processed immediately via Stripe
2. **Offline Mode**: Payments are queued locally in SQLite
3. **Auto-Sync**: Queued payments are processed when connectivity is restored
4. **Retry Logic**: Failed payments are retried with exponential backoff
5. **SMS Notifications**: Merchants receive SMS confirmations for all transactions

### Network Monitoring
- Real-time connectivity status display
- Automatic offline detection
- Background sync when online
- Visual indicators for connection quality

## 🔒 Security Features

- **Environment Variables**: Sensitive data stored in .env files
- **Input Validation**: Server-side validation for all inputs
- **Error Handling**: Graceful error handling without exposing internals
- **HTTPS Ready**: Configured for production HTTPS deployment

## 🚀 Production Deployment

### Environment Variables
Ensure all production environment variables are set:
- `STRIPE_SECRET_KEY` (production key)
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE`
- `MERCHANT_PHONE`

### SSL/HTTPS
Configure nginx with SSL certificates for production use.

### Database
Consider using PostgreSQL for production instead of SQLite for better scalability.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the documentation in the `/docs` folder
- Review the API documentation

## 🎯 Roadmap

- [ ] Multi-currency support
- [ ] Advanced analytics dashboard
- [ ] Mobile app (React Native)
- [ ] Webhook integrations
- [ ] Advanced fraud detection
- [ ] Multi-merchant support
- [ ] Real-time notifications
- [ ] Advanced reporting

---

**QueuePay** - Making payments work everywhere, even when connectivity doesn't. 