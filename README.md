# .Galaxy

> **One workspace for every model.**

A local-first, provider-agnostic AI chat workspace for OpenAI-compatible endpoints. Your keys and conversations stay in your browser.

## Features

- **Bring Your Own Key** — Connect any OpenAI-compatible endpoint with your own API key
- **Auto-detect Models** — Automatically fetch available models via `GET /models`
- **Streaming Responses** — Real-time token streaming with SSE
- **Local-first** — All data stored in IndexedDB, nothing leaves your browser
- **Multi-endpoint** — Switch between providers seamlessly
- **Keyboard-first** — Enter to send, Shift+Enter for new line, Esc to stop
- **Dark & Clean** — Terminal-inspired UI with modern ergonomics

## Security

- API keys never leave your browser
- No backend server, no analytics, no tracking
- Content Security Policy enforced
- No external CDN dependencies at runtime
- Clear all local data with one click

## Tech Stack

- React 18 + TypeScript
- Vite
- IndexedDB (native, no library)
- CSS Variables + Custom Design System

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
git clone https://github.com/yourusername/galaxy.git
cd galaxy
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

### Build

```bash
npm run build
```

Output will be in `dist/` — deployable to any static hosting (GitHub Pages, Vercel, Cloudflare Pages, etc.).

## Usage

1. Click **Connect Endpoint**
2. Enter your OpenAI-compatible Base URL (e.g., `https://openrouter.ai/api/v1`)
3. Enter your API Key
4. Select a model from the auto-detected list
5. Start chatting

### Supported Endpoints

Any service that implements the OpenAI-compatible API:

- OpenRouter
- Groq
- Together AI
- DeepSeek
- Local LLM servers (Ollama, LM Studio, vLLM, etc.)
- Custom inference APIs

## Configuration

### Endpoint Format

```
Base URL: https://api.example.com/v1
API Key:  sk-...
Model:    auto-detected via /models
```

The app will:
1. Call `GET {baseUrl}/models` to discover available models
2. Use `POST {baseUrl}/chat/completions` for chat requests

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Enter` | Send message |
| `Shift+Enter` | New line |
| `Escape` | Stop generation / Close dialog |
| `Ctrl/Cmd+K` | (planned) Model switcher |
| `Ctrl/Cmd+N` | (planned) New conversation |

## Roadmap

### v0.2
- [ ] Model switcher within conversation
- [ ] Edit & regenerate messages
- [ ] System prompt per conversation
- [ ] Temperature & max tokens settings
- [ ] Export conversation to Markdown/JSON

### v0.3
- [ ] File attachment (local text files)
- [ ] Encrypted vault with password
- [ ] Self-hosted CORS proxy option
- [ ] Light mode
- [ ] Mobile responsive improvements

### Future
- [ ] Tool calling / function support
- [ ] Image input (vision models)
- [ ] Multi-model parallel chat
- [ ] Prompt library
- [ ] Cloud sync (optional, E2E encrypted)

## Development

### Project Structure

```
src/
├── components/
│   ├── App.tsx
│   ├── ChatWorkspace.tsx
│   ├── ConnectionDialog.tsx
│   └── Sidebar.tsx
├── lib/
│   ├── api.ts          # OpenAI-compatible API client
│   ├── db.ts           # IndexedDB wrapper
│   ├── endpoint.ts     # URL normalization
│   └── endpoint.test.ts
├── types.ts            # TypeScript interfaces
├── index.css           # Design tokens & base styles
└── main.tsx            # Entry point
```

### Running Tests

```bash
npm test
```

### Linting

```bash
npm run lint
```

## License

MIT — see [LICENSE](LICENSE) for details.

## Contributing

Contributions welcome! Please read our contributing guidelines before submitting PRs.

## Acknowledgments

- Inspired by OpenCode, Warp, Linear, and terminal aesthetics
- Built with React, Vite, and a lot of coffee

---

**.Galaxy** — Switch models. Keep your flow.
