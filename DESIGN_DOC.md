# Project Plan: Karma Court (Discord Activity)

## 1. Executive Summary
**Karma Court** is a real-time, multiplayer Discord Activity designed to gamify conflict resolution within online communities. By transforming petty disputes (e.g., "stealing a kill in a game" or "ghosting the chat") into a theatrical, interactive mock trial, the application provides a fun, structured way for users to engage with each other directly in voice channels.

**Note:** This is my inaugural project using the **Discord Embedded App SDK**, representing a significant milestone in learning how to build deeply integrated, social experiences for the Discord platform.

## 2. Core Purpose & Value Proposition
*   **The Problem:** Discord servers often experience low-stakes drama or awkward silences. Traditional moderation tools (bans/mutes) are too harsh for friendly banter.
*   **The Solution:** A "Justice System" as a game. It allows users to air grievances in a comedic setting, increasing time-spent-in-app and deepening community bonds through shared storytelling.
*   **Why Use It?**
    *   **Interactive Entertainment:** Instead of just chatting, users *play* a role (Judge, Jury, Accused).
    *   **Content Generation:** Perfect for streamers or community nights, generating memorable moments and "clips."
    *   **Zero-Friction:** Launches instantly within Discord—no external downloads or account creation required.

## 3. Technical Architecture

### 3.1 Tech Stack
*   **Frontend:**
    *   **Framework:** React 19 (TypeScript) for robust, component-based UI.
    *   **Build Tool:** Vite for lightning-fast HMR and optimized production builds.
    *   **Styling:** Tailwind CSS v4 for a highly responsive, "Cyber-Justice" neon aesthetic.
    *   **Animation:** `Framer Motion` for cinematic transitions (evidence reveals, verdict stamps).
    *   **SDK:** Discord Embedded App SDK for user authentication and context awareness.
*   **Backend:**
    *   **Server:** Python (FastAPI) chosen for its speed and native async support.
    *   **Communication:** WebSockets for sub-millisecond state synchronization (voting, timers).
    *   **Security:** `PyNaCl` for validating cryptographic signatures from Discord Interactions.
    *   **Deployment:** Docker-ready structure suitable for platforms like Railway or Render.

### 3.2 Key Systems
*   **Multitenancy:** The backend uses a `GameRegistry` to isolate game state per Discord Channel/Instance, allowing thousands of simultaneous trials.
*   **Real-Time Sync:** A custom WebSocket protocol synchronizes the "Evidence Board," "Timer," and "Vote Counts" instantly across all clients.
*   **Coward's Punishment Protocol:** Server-side logic detects if an "Accused" user disconnects mid-trial and automatically issues a "Guilty" verdict to prevent griefing.
* **Bot Integration:** A hybrid approach where the Activity handles the real-time gameplay, while the Bot archives the final "Verdict & Sentence" to the text channel as a permanent record.

## 4. User Experience (UX) Highlights
*   **Atmospheric Design:** The UI is reactive—shifting from "Cool Blue" (Safety) to "Alarm Red" (Danger) based on the live vote count.
*   **Audio Engineering:** An internal `MusicManager` cross-fades background tracks and plays spatial sound effects (Gavels, Objections) without interrupting voice chat.
*   **Anti-Lag Input:** Optimistic UI updates ensure that typing "Crimes" or "Evidence" feels instant, even on higher latency connections.

## 5. Future Roadmap
*   **Persistence:** A database layer to track "Win/Loss" records for aspiring internet lawyers.
*   **Economy:** Integration with server currencies to allow "Bailing out" friends.
*   **Spectator Mode:** A dedicated UI for Twitch streamers to broadcast trials while allowing chat to vote as the jury.
