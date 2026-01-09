# ⚖️ Karma Court: The Discord Justice System

![Karma Court Banner](client/public/assets/splash.png)

> **"Order in the court! The chat is now in session."**

**Karma Court** is a real-time, interactive **Discord Activity** that gamifies community conflict resolution. Built for the **Discord Embedded App SDK**, it transforms petty server drama into high-stakes theatrical trials, complete with a judge, jury, evidence board, and automated sentencing.

---

## 📋 Table of Contents
- [Features](#-features)
- [Architecture & Tech Stack](#-architecture--tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Configuration](#-configuration)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

---

## ✨ Features

- **🌐 Multitenancy:** Designed for scale. Supports unlimited concurrent courtroom sessions, with each Discord server or channel receiving its own isolated game instance.
- **⚡ Realtime Courtroom:** Built on high-performance WebSockets to ensure every vote, objection, and verdict is synchronized instantly across all clients.
- **⚖️ Judge and Jury System:** Roles are automatically assigned—one user presides as the Judge while others serve as the Jury, voting on the fate of the Accused.
- **📌 Evidence Board:** A shared digital canvas where users can submit text-based evidence cards that appear dynamically for all participants to review.
- **📜 Court Record:** A scrolling terminal-style log that captures every action, from "Objections" to the final sentencing, ensuring a transparent trial history.
- **🎨 Dynamic Feedback:** The UI reacts to the trial's momentum—shifting colors and animations based on the "Guilty" vs "Innocent" vote balance.
- **🛡️ Robust Error Handling:** Comprehensive system stability with automatic reconnection strategies and clear user feedback for network or SDK issues.
- **📢 Discord Embed Integration:** The bot seamlessly posts rich trial summaries (Verdicts and Sentences) directly to the server text chat, creating a permanent hall of fame (or shame) for the community.
- **🚨 Interactive "OBJECTION!":** A chaotic, rate-limited mechanic allowing any user to interrupt the court with visual and audio feedback.
- **🏃 Coward's Punishment:** Trying to flee the country? If the Accused user disconnects mid-trial, the system automatically declares them **GUILTY** of Contempt of Court and assigns a "Severe Sentence" immediately.
- **🤖 AI Crime Generator:** Can't think of an accusation? The system pulls from a curated database of "Discord Crimes" (e.g., *"Ghosting the squad for 3 weeks"*).

### 🎬 Production-Grade UI/UX
- **Cinematic Transitions:** Powered by `Framer Motion`, every screen transition, evidence reveal, and verdict stamp is smoothly animated.
- **Dynamic Audio System:** Features an intelligent Music Manager that cross-fades between "Lobby", "Trial", and "Verdict" themes, plus spatial sound effects for gavels and objections.
- **Anti-Lag Typing:** Implemented local optimistic state updates with debouncing to ensure typing crimes or evidence feels instant, even on slower connections.
- **Atmospheric Visuals:** The entire courtroom reacts to the trial's state—pulsing with tension when the timer is low and shifting color palettes based on who is winning the vote.

---

## 🛠 Architecture & Tech Stack

The project utilizes a decoupled client-server architecture designed for **multitenancy** and **scalability**.

### **Frontend (Client)**
- **Framework:** [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool:** [Vite](https://vitejs.dev/)
- **Integration:** [Discord Embedded App SDK](https://discord.com/developers/docs/activities/overview)
- **Styling:** Tailwind CSS v4 (Custom "Neon/Cyber" Design System)
- **State Management:** React Context + Custom Hooks (`useFeedback`, `useAccessibility`)

### **Backend (Server)**
- **Runtime:** Python 3.10+
- **API Framework:** [FastAPI](https://fastapi.tiangolo.com/) (Async support)
- **Real-Time:** Native WebSockets
- **Security:** `PyNaCl` for Ed25519 signature verification (Discord Interactions)
- **Protocol:** Custom JSON-based WS protocol for game state payloads (`vote`, `objection`, `sync`)

---

## 📂 Project Structure

```bash
Karma-court-discord/
├── client/                 # React Frontend Application
│   ├── src/
│   │   ├── components/     # Atomic UI components (Courtroom, EvidenceCard)
│   │   ├── context/        # Global state providers
│   │   ├── services/       # API & WebSocket connectors
│   │   └── types/          # TypeScript interfaces (Game, User, Evidence)
│   └── public/assets/      # Static assets (sounds, icons)
│
└── server/                 # Python FastAPI Backend
    ├── main.py             # Application entry point & WS routing
    ├── utils/              # Helper modules (Security, Error Handling)
    └── requirements.txt    # Backend dependencies
```

---

## 🚀 Getting Started

Follow these instructions to set up the development environment locally.

### Prerequisites
- Node.js v18+ & npm
- Python 3.10+
- A Discord App created in the [Developer Portal](https://discord.com/developers/applications)

### 1. Backend Setup
Initialize the Python server to handle game state and WebSocket connections.

```bash
cd server

# Create and activate virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create environment file
cp sample.env .env
# Edit .env with your DISCORD_CLIENT_ID and SECRET

# Run the server
uvicorn main:app --reload --port 8000
```

### 2. Frontend Setup
Launch the client application.

```bash
cd client

# Install dependencies
npm install

# Create environment file
cp sample.env .env
# Set VITE_DISCORD_CLIENT_ID in .env

# Start development server
npm run dev
```

### 3. Tunneling (Crucial for Discord)
Discord Activities require a secure HTTPS connection. Use a tunneling service to expose your local ports.

```bash
# Example using Cloudflared
cloudflared tunnel --url http://localhost:5173
```
*Note: Copy the generated HTTPS URL to your Discord App's "URL Mappings" in the Developer Portal.*

---

## 🗺️ Roadmap

We are constantly improving the justice system. Future plans include:

- **📊 Persistent User Stats:** A database layer to track "Win/Loss" records for Judges and Attorneys across all servers.
- **🎭 Custom Avatars:** Allow players to upload custom character sprites to appear in the dock or witness stand.
- **💰 Economy Integration:** Connect with popular economy bots to allow "Bail" payments or "Fines" using server currency.
- **🎙️ Voice-to-Text Records:** Automatic transcription of voice channels to generate a searchable court transcript.
- **📺 Spectator Mode:** A dedicated view for Twitch streamers to broadcast trials with overlay controls for chat voting.

---

## 🤝 Contributing

Contributions are welcome! Please check the `LICENSE` file for details.

1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📧 Contact

**Team Karma Court** - [GitHub Repository](https://github.com/yourusername/karma-court)

*Built with ❤️ for the Discord App Buildathon 2026.*
