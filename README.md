# Layout Agent

A chat-based design layout transformation tool powered by LLM reasoning. Users interact with a design layout through natural language — saying things like "Convert this to 9:16" or "Make the headline smaller" — and the layout JSON and wireframe preview update in real-time. The agent understands semantic roles ("the headline", "the product image", "the discount badge") and translates human intent into precise coordinate transformations.

**Live Demo:** [layout-agent-production.up.railway.app](https://layout-agent-production.up.railway.app)

---

## Prerequisites

- **Node.js** 18+ (tested on v22)
- **npm** 8+
- **LLM API key** — one of the following (see [Multi-Provider Support](#multi-provider-support) below):
  - [Groq](https://console.groq.com/keys) (free, recommended for testing) — `gsk_...`
  - [Anthropic](https://console.anthropic.com/settings/keys) — `sk-ant-api03-...`
  - [OpenRouter](https://openrouter.ai/settings/keys) — `sk-or-v1-...`

---

## Setup

```bash
# 1. Clone the repository
git clone https://github.com/<your-username>/layout-agent.git
cd layout-agent

# 2. Install dependencies
cd server && npm install
cd ../client && npm install

# 3. Configure environment
cd ../server
cp .env.example .env
# Edit .env and add your API key:
#   GROQ_API_KEY=gsk_your_key_here

# 4. Run (two terminals)
# Terminal 1 — backend
cd server && npm run dev

# Terminal 2 — frontend
cd ../client && npm run dev
```

Open **http://localhost:5173** in your browser.

---

## How to Use

Type natural language commands in the chat panel. The wireframe and JSON update after each response.

### Example Prompts to Try

| Command | What Happens |
|---------|-------------|
| `Convert this to 9:16` | Resizes artboard from 1080×1080 to 1080×1920, reflows all elements |
| `Move the headline to the top` | Repositions the "Luxury Comfort" text to the top of the canvas |
| `Make the headline smaller` | Reduces headline font size and bounding box proportionally |
| `Change the headline color to red` | Updates headline text color — visible in the wireframe |
| `Move the offer badge higher` | Shifts the "Limited time offer" CTA upward |
| `Make the discount badge bigger` | Scales both the yellow circle and "20% OFF" text together |
| `Center the product` | Moves the product image to the center of the canvas |
| `Make it bigger` | Follow-up — understands "it" from the previous command's context |

### Tips
- **Be specific or be vague** — both work. "Set headline ny to 0.05" and "put the title at the top" do the same thing.
- **Follow-ups work** — after any command, say "make it bigger", "undo that", or "move it left" and the agent knows what "it" refers to.
- **Reset anytime** — click the "Reset Layout" button to return to the original design.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18 + Vite 6 | Component rendering, hot reload |
| **Styling** | Tailwind CSS 3 | Dark theme UI, responsive layout |
| **HTTP Client** | Axios | API calls with 60s timeout |
| **Backend** | Node.js + Express | API proxy, keeps LLM keys server-side |
| **LLM** | Groq (Llama 3.1 8B) | Semantic reasoning — identifies elements, interprets intent |
| **State** | React useState | Layout JSON + chat history (no external state library) |
| **Deployment** | Railway | Single-URL production hosting |

---

## Multi-Provider Support

This project was tested across multiple LLM providers during development. Switching providers requires changing only **one file** (`server/services/llmService.js`) — the API URL, model name, and auth header.

### Providers Tested

| Provider | Model | Cost | Speed | JSON Reliability | Notes |
|----------|-------|------|-------|-----------------|-------|
| **Groq** | Llama 3.1 8B Instant | Free (generous limits) | ~200ms | Good with prompt tuning | **Current default.** 30 req/min, 100K tokens/day free |
| **Groq** | Llama 3.3 70B | Free | ~800ms | Better reasoning | Higher quality but burns through daily token limit 4× faster |
| **Anthropic** | Claude Sonnet 4 | ~$3/M input tokens | ~2-4s | Excellent | Best JSON accuracy, but requires paid API key |
| **Anthropic** | Claude Haiku 3.5 | ~$0.25/M input | ~1s | Very good | Good balance of cost and quality |
| **OpenRouter** | Any model via proxy | Varies | Varies | Varies | Useful for accessing multiple providers with one key |

### Rate Limit Management — Lessons Learned

Rate limiting was the most operationally challenging aspect of this project. Each provider handles it differently, and getting it wrong means a broken user experience.

**Groq** enforces three limits simultaneously: requests per minute (30 RPM), tokens per minute (6,000 TPM for free tier), and tokens per day (100,000 TPD). The daily limit is the one that bites — during development, the 70B model consumed ~2,500 tokens per request (system prompt + response), meaning roughly 40 requests before hitting the wall. Switching to the 8B model cut usage to ~800 tokens per request, giving ~125 requests per day. The server implements automatic retry with backoff: on a 429 response, it parses the `Retry-After` header, waits, and retries up to 3 times transparently.

**OpenRouter** uses a credit-based system. The most common failure mode is requesting more `max_tokens` than your balance can cover — the API returns a 402 with the exact number of tokens you can afford. This required progressively lowering `max_tokens` from 8192 → 2048 → 1024 during testing. The diff-based architecture (see APPROACH.md) was partly motivated by this constraint: smaller responses = cheaper requests = more testing budget.

**Anthropic** is the most straightforward — standard RPM/TPM limits with clear error messages. The main challenge is cost: sending the full layout JSON (~3,000 tokens) in every request adds up. The system prompt optimization that compresses the layout into a ~500 token summary reduced per-request cost by roughly 60%.

**Implementation strategy:**
```
429 response → parse retry delay → wait → retry (up to 3×)
402 response → reduce max_tokens or switch to cheaper model
401 response → surface clear error about invalid key
```

The retry logic lives in `fetchWithRetry()` in `llmService.js` and handles all providers uniformly since they all use standard HTTP status codes.

---

## Project Structure

```
layout-agent/
├── client/                        # React frontend (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── App.jsx            # Main layout — chat panel + preview/JSON tabs
│   │   │   ├── ChatWindow.jsx     # Auto-scrolling message list + typing indicator
│   │   │   ├── ChatInput.jsx      # Text input with send button
│   │   │   ├── MessageBubble.jsx  # User (blue) / assistant (dark) message styling
│   │   │   ├── WireframePreview.jsx  # Visual layout with color-coded nodes
│   │   │   └── JsonViewer.jsx     # Syntax-highlighted collapsible JSON
│   │   ├── hooks/
│   │   │   └── useLayoutAgent.js  # Core state: layout, messages, loading, sendMessage
│   │   ├── data/
│   │   │   └── initialLayout.json # 1080×1080 Instagram post with 13 elements
│   │   └── utils/
│   │       └── api.js             # Axios wrapper (configurable base URL for deploy)
│   └── vite.config.js             # Dev proxy: /api → localhost:3001
├── server/                        # Express backend
│   ├── index.js                   # Entry point — serves API + built frontend
│   ├── routes/
│   │   └── chat.js                # POST /api/chat — diff application engine
│   ├── services/
│   │   ├── llmService.js          # LLM API call + retry + JSON recovery
│   │   └── layoutTransforms.js    # Deterministic helpers (resize, move, scale)
│   ├── prompts/
│   │   └── systemPrompt.js        # Compact prompt with node summary + diff format
│   └── utils/
│       └── jsonValidator.js       # Structural validation for layout JSON
├── render.yaml                    # Render deployment config
├── railway.toml                   # Railway deployment config
├── APPROACH.md                    # Architecture and design decisions
└── README.md                      # This file
```

---

## Deployment

The server serves both the API and the built React frontend from a single process, so one deployment = one URL.

### Railway (current production)

1. Push to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Add variable: `GROQ_API_KEY` = your key
4. Railway auto-detects `railway.toml` and deploys

### Render

1. Push to GitHub
2. Go to [render.com](https://render.com) → New Web Service → connect repo
3. Build command: `cd client && npm install && npm run build && cd ../server && npm install`
4. Start command: `cd server && node index.js`
5. Add env var: `GROQ_API_KEY`

### Manual (AWS EC2 / Azure VM / any VPS)

```bash
git clone <your-repo> && cd layout-agent
cd client && npm install && npm run build && cd ..
cd server && npm install
echo "GROQ_API_KEY=gsk_..." > .env
node index.js
# Live on port 3001
```

---

## License

MIT
