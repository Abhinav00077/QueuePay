#!/bin/bash

echo "🚀 Starting Offline Payment System..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "📦 Installing dependencies..."

# Install client dependencies
echo "Installing client dependencies..."
cd client
npm install
cd ..

# Install server dependencies
echo "Installing server dependencies..."
cd server
npm install
cd ..

echo "🔧 Setting up environment..."

# Create .env files if they don't exist
if [ ! -f "client/.env" ]; then
    echo "Creating client .env file..."
    cat > client/.env << EOF
REACT_APP_API_URL=http://localhost:3001
EOF
fi

if [ ! -f "server/.env" ]; then
    echo "Creating server .env file..."
    cat > server/.env << EOF
PORT=3001
NODE_ENV=development
DATABASE_URL=postgresql://postgres:password@localhost:5432/offline_payments
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE=+1234567890
MERCHANT_PHONE=+1234567890
EOF
    echo "⚠️  Please update server/.env with your actual API keys"
fi

echo "🏗️  Building server..."
cd server
npm run build
cd ..

echo "🚀 Starting servers..."

# Start server in background
echo "Starting server on http://localhost:3001"
cd server
npm run dev &
SERVER_PID=$!
cd ..

# Wait a moment for server to start
sleep 3

# Start client
echo "Starting client on http://localhost:3000"
cd client
npm start &
CLIENT_PID=$!
cd ..

echo "✅ Offline Payment System is starting..."
echo ""
echo "📱 Client: http://localhost:3000"
echo "🔧 Server: http://localhost:3001"
echo "🏥 Health: http://localhost:3001/health"
echo ""
echo "Press Ctrl+C to stop all services"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    kill $SERVER_PID 2>/dev/null
    kill $CLIENT_PID 2>/dev/null
    echo "✅ Services stopped"
    exit 0
}

# Trap Ctrl+C and call cleanup
trap cleanup SIGINT

# Wait for background processes
wait 