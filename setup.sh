#!/bin/bash
set -e

echo "🔧 Setting up Layout Agent..."
echo ""

# Server setup
echo "📦 Installing server dependencies..."
cd server
if [ ! -f .env ]; then
  cp .env.example .env
  echo "   Created .env from .env.example"
  echo "   ⚠️  Edit server/.env and add your ANTHROPIC_API_KEY"
fi
npm install
cd ..

# Client setup
echo ""
echo "📦 Installing client dependencies..."
cd client
npm install
cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "To run the app:"
echo "  Terminal 1:  cd server && npm run dev"
echo "  Terminal 2:  cd client && npm run dev"
echo ""
echo "Then open http://localhost:5173"
