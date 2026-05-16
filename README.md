# Layout Agent

A chat-based layout transformation tool. Users see a design layout, chat with an AI assistant using natural language, and watch the layout update in real-time.

## What It Does

Send natural language commands to modify a design layout:

- **"Convert this to 9:16"** — resizes the artboard and reflows all elements
- **"Make the headline smaller"** — scales the headline text down
- **"Move the product to the center"** — repositions the product image
- **"Change the badge color to red"** — updates the discount badge color
- Follow-up commands like **"make it bigger"** understand what you last changed

## Architecture

- **Frontend**: React + Vite + Tailwind CSS (wireframe preview, chat interface, JSON viewer)
- **Backend**: Node.js + Express (proxies LLM calls, keeps API key server-side)
- **LLM**: Claude (Anthropic) — reasons about which elements to modify
- **Hybrid approach**: LLM handles semantic reasoning ("which element is the headline?"), deterministic helpers handle math (coordinate transformations)

## Setup

### Prerequisites
- Node.js 18+
- An Anthropic API key

### Install

```bash
# Server
cd server
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
npm install

# Client
cd ../client
npm install
```

### Run

```bash
# Terminal 1 — start the backend
cd server
npm run dev

# Terminal 2 — start the frontend
cd client
npm run dev
```

Open http://localhost:5173 in your browser.

## Project Structure

```
layout-agent/
├── client/                   # React frontend
│   ├── src/
│   │   ├── components/       # UI components
│   │   │   ├── ChatWindow.jsx
│   │   │   ├── ChatInput.jsx
│   │   │   ├── MessageBubble.jsx
│   │   │   ├── WireframePreview.jsx
│   │   │   └── JsonViewer.jsx
│   │   ├── hooks/
│   │   │   └── useLayoutAgent.js  # Core state management
│   │   ├── data/
│   │   │   └── initialLayout.json # Starting layout
│   │   ├── utils/
│   │   │   └── api.js        # Axios wrapper
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── vite.config.js        # Dev proxy to backend
├── server/                   # Express backend
│   ├── routes/
│   │   └── chat.js           # POST /api/chat endpoint
│   ├── services/
│   │   ├── llmService.js     # Anthropic SDK wrapper
│   │   └── layoutTransforms.js # Deterministic math helpers
│   ├── prompts/
│   │   └── systemPrompt.js   # The agent's brain
│   └── utils/
│       └── jsonValidator.js   # Output validation
└── APPROACH.md               # Design decisions
```

## Layout JSON Format

The layout uses a **dual coordinate system**:
- **Absolute**: `x`, `y`, `width`, `height` (pixel values)
- **Normalized**: `nx`, `ny`, `nw`, `nh` (0–1, relative to artboard)

Normalized coordinates are the source of truth. When the artboard resizes, everything recomputes from normalized values. Text nodes also have `fontSizeRatio` (fontSize / artboard width) for proportional scaling.

## Deploy (Single URL)

The server serves both the API and the built frontend, so you only need one deployment.

### Option 1: Render (easiest, free tier)

1. Push to GitHub
2. Go to [render.com](https://render.com), create a **New Web Service**
3. Connect your repo
4. Settings:
   - **Build Command**: `cd client && npm install && npm run build && cd ../server && npm install`
   - **Start Command**: `cd server && node index.js`
5. Add environment variable: `ANTHROPIC_API_KEY` = your OpenRouter/Anthropic key
6. Deploy — you'll get a URL like `https://layout-agent-xxxx.onrender.com`

Or just push with the included `render.yaml` — Render auto-detects it via Blueprints.

### Option 2: Railway

1. Push to GitHub
2. Go to [railway.app](https://railway.app), New Project → Deploy from GitHub
3. Add env var `ANTHROPIC_API_KEY`
4. Railway auto-detects `railway.toml` and deploys

### Option 3: Manual (any VPS / AWS EC2 / Azure)

```bash
# On the server
git clone <your-repo>
cd layout-agent
cd client && npm install && npm run build && cd ..
cd server && npm install
echo "ANTHROPIC_API_KEY=sk-or-..." > .env
node index.js
# App is live on port 3001
```
