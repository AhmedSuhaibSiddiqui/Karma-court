# ⚖️ Karma Court: Discord Activity

![Karma Court Splash](client/public/assets/splash.png)

**Karma Court** is a high-stakes, real-time multiplayer Discord Activity where you can put your friends on trial for their "crimes." From eating the last slice of pizza to being "too lucky" in games, the Judge and the Jury decide the final verdict.

Featuring a sleek **Cyber-Justice** aesthetic, interactive "Objection!" mechanics, and a live evidence board.

---

## 🚀 Features

- **Multi-Tenancy:** Supports unlimited concurrent courtroom sessions. Each Discord server/channel gets its own private instance.
- **Real-time Courtroom:** Built with WebSockets for instant voting and feedback.
- **Judge & Jury System:** Auto-assigned Judge role with the power to accuse, present evidence, and call the final verdict.
- **OBJECTION! Mechanic:** Shake the screen and interrupt the court with a giant animated splash.
- **Evidence Board:** Submit "evidence" (text/notes) that appears as holographic cards on the board.
- **Court Record:** A scrolling terminal log of every action taken during the session.
- **Dynamic Feedback:** UI colors shift from Fire (Red/Guilty) to Ice (Blue/Innocent) based on the current vote lead.
- **Responsive Design:** Optimized for both large desktop windows and narrow Discord mobile/sidebar panels.
- **Robust Error Handling:** Comprehensive logging and error recovery for network and SDK issues.

## 🛠 Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Framer Motion, Discord Embedded App SDK.
- **Backend:** Python (FastAPI), WebSockets, Uvicorn, PyNaCl.
- **Styling:** Tailwind CSS v4 (Cyberpunk/Neon theme).

---

## 📂 Project Structure

```
Karma-court-discord/
├── client/                 # Frontend React Application
│   ├── src/
│   │   ├── components/     # UI Components (Courtroom, Evidence, etc.)
│   │   ├── context/        # React Context (Feedback/Toast system)
│   │   ├── hooks/          # Custom Hooks (useAccessibility, etc.)
│   │   ├── services/       # API & Analytics services
│   │   ├── types/          # TypeScript definitions
│   │   └── utils/          # Helper functions
│   ├── public/             # Static assets (images, sounds)
│   └── vite.config.ts      # Vite configuration
│
└── server/                 # Backend Python Application
    ├── main.py             # FastAPI entry point & WebSocket logic
    ├── utils/              # Helper modules (Security, Discord Bot)
    └── requirements.txt    # Python dependencies
```

---

## 📦 Setup Instructions

### 1. Discord Developer Portal
1. Create an application on the [Discord Developer Portal](https://discord.com/developers/applications).
2. Go to **OAuth2** -> **General** and get your **Client ID** and **Client Secret**.
3. Go to **Embedded App SDK** and set up your URLs (for local dev, use your tunnel URL).

### 2. Backend Setup (Server)
```bash
cd server
python -m venv venv

# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
cp sample.env .env  # Add your Discord credentials to .env

# Start the server (Development)
uvicorn main:app --reload --port 8000
```

### 3. Frontend Setup (Client)
```bash
cd client
npm install
cp sample.env .env  # Add your Discord Client ID to .env
npm run dev
```

### 4. Tunneling (Required for Discord)
Since Discord Activities require HTTPS, use a tunnel like `cloudflared` or `ngrok`:
```bash
cloudflared tunnel --url http://localhost:5173
```
Map the generated URL in your Discord Developer Portal under **Embedded App SDK -> URL Mappings**.

---

## ❓ Troubleshooting

**Q: The activity fails to load in Discord.**
*   **A:** Ensure your tunnel (cloudflared/ngrok) is running and the URL matches the one in the Discord Developer Portal > Embedded App SDK.
*   **A:** Check the browser console (Ctrl+Shift+I) for CSP (Content Security Policy) errors.

**Q: WebSockets aren't connecting.**
*   **A:** Verify the `VITE_BACKEND_URL` in `client/.env` points to your backend server (e.g., `ws://localhost:8000` or your tunnel WSS URL).

**Q: Sounds aren't playing.**
*   **A:** Browsers block auto-playing audio. Interact with the page (click anywhere) to enable the audio context.

---

## 🗺️ Roadmap

- [ ] **Custom Avatars:** Allow users to upload custom evidence images.
- [ ] **Voice Integration:** Basic voice modulation for the Judge.
- [ ] **Spectator Mode:** Better UI for users who join mid-trial.
- [ ] **Twitch Integration:** Allow stream viewers to vote as the Jury.

---

## 🤝 Contributing

1. Fork the repository.
2. Create a new branch: `git checkout -b feature/your-feature-name`.
3. Commit your changes: `git commit -m 'Add some feature'`.
4. Push to the branch: `git push origin feature/your-feature-name`.
5. Open a Pull Request.

## 📜 License

This project is open-source. Feel free to fork, modify, and put your friends on trial!