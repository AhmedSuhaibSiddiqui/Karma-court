# ⚖️ Karma Court: Discord Activity

Karma Court is a high-stakes, real-time multiplayer Discord Activity where you can put your friends on trial for their "crimes." From eating the last slice of pizza to being "too lucky" in games, the Judge and the Jury decide the final verdict.

Featuring a sleek **Cyber-Justice** aesthetic, interactive "Objection!" mechanics, and a live evidence board.

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

- **Frontend:** React, TypeScript, Vite, Framer Motion, Discord Embedded App SDK.
- **Backend:** Python, FastAPI, WebSockets (with separate GameRegistry).
- **Styling:** Custom CSS with Cyber-Justice theme.

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

## 🌐 Deployment (Production)

- **Backend:** Deploy `server/` to [Render](https://render.com), [Fly.io](https://fly.io), or AWS.
  - **Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
  - **Env Vars:** `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`.
- **Frontend:** Deploy `client/` to [Vercel](https://vercel.com) or [Netlify](https://netlify.com).
  - **Env Vars:** `VITE_DISCORD_CLIENT_ID`, `VITE_BACKEND_URL` (set to your deployed backend HTTPS URL).

## 📜 License

This project is open-source. Feel free to fork, modify, and put your friends on trial!
