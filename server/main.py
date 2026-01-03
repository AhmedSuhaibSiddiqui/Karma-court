import os
import requests
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from typing import List, Dict, Optional
import json
import time
from utils.error_handler import handle_error, log_info
from utils.security import SecurityService

# 1. Load Secrets
load_dotenv()
CLIENT_ID = os.getenv("DISCORD_CLIENT_ID")
CLIENT_SECRET = os.getenv("DISCORD_CLIENT_SECRET")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- GAME STATE MANAGER ---
class GameManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.user_map: Dict[WebSocket, str] = {} # Map WS -> user_id
        self._timer_task: Optional[asyncio.Task] = None
        
        # Security: Rate Limiting
        self.last_objection_time = 0
        self.user_last_action: Dict[str, float] = {} # user_id -> timestamp
        
        self.state = {
            "votes": {"guilty": 0, "innocent": 0},
            "crime": "",
            "verdict": None, # 'guilty' | 'innocent' | None
            "judge_id": None,
            "accused": {
                "id": None,
                "username": "Unknown",
                "avatar": None
            },
            "witness": {
                "username": None,
                "avatar": None
            },
            "voters": [],   # Track who voted
            "evidence": [], # List of {id, type, content, author}
            "logs": [],      # List of {timestamp, message, type}
            "timer": 60,     # Voting timer in seconds
            "sentence": None # The punishment if guilty
        }
        
        # --- DATA BANKS (SIMULATED AI) ---
        self.crimes_db = [
            "Posting cringe in #general",
            "Ghosting the squad for 3 weeks",
            "Eating chips with an open mic",
            "Using light mode unironically",
            "Backseat gaming during a clutch",
            "Pronouncing 'GIF' wrong",
            "Spamming @everyone for no reason",
            "Not boosting the server",
            "Playing music bot at 200% volume",
            "Stealing the last kill",
            "Being AFK during the ready check",
            "Having a chaotic desktop",
            "Not saying 'GG' after a loss",
            "Simping too hard",
            "Using comic sans",
            "Replying 'k' to a long paragraph",
            "Leaving only 1 second on the microwave",
            "Spoiling the movie ending 'by accident'",
            "Using 'Reply All' on a company-wide email",
            "Chewing loudly in voice chat",
            "Not cropping the meme before posting",
            "Sending voice messages longer than 2 minutes",
            "Asking a question that was just answered",
            "Linking a 30-minute YouTube video without a timestamp",
            "Saying 'I'm down' then sleeping immediately"
        ]
        
        self.sentences_db = [
            "Must change nickname to 'Clown' for 24h",
            "Banned from using vowels in chat for 10m",
            "Must sing an apology song in VC",
            "Forced to use Light Mode for 5 minutes",
            "Must post a cringe selfie",
            "Cannot speak for 3 rounds",
            "Must compliment the Judge for 1 minute",
            "Sentenced to play League of Legends",
            "Publicly shamed in #announcements",
            "Must end every sentence with 'uwu' for 1 hour",
            "Forced to use a default Discord avatar for a week",
            "Banned from using emojis for 24 hours",
            "Must change status to 'I love Nickelback'",
            "Cannot mute mic for the next 30 minutes",
            "Must write a haiku about their crime",
            "Sentenced to be the server's personal butler for a day",
            "Must react to every message with a clown emoji",
            "Forced to stream their desktop while organizing it",
            "Must use 'Comic Sans' logic in all arguments",
            "Cannot say the word 'the' for 10 minutes",
            "Must send a heartfelt apology to a bot",
            "Required to narrate their own actions in 3rd person",
            "Banned from sharing memes for 48 hours",
            "Must wear a virtual 'Cone of Shame' (Status)",
            "Sentenced to explain FNAF lore to the chat",
            "Must reply with a GIF to every message for 10m",
            "Forced to listen to 1 hour of elevator music"
        ]

        self.severe_sentences = [
            "BANNED: Must use only 'Meow' in chat for 24 hours.",
            "EXILE: Forbidden from entering Voice Chat for 3 days.",
            "SHAME: Must post a 500-word essay on why they are a coward.",
            "TOTAL LOCKDOWN: Forced to use a 'Pig' avatar for 1 week.",
            "COMMUNITY SERVICE: Must clean (moderate) the #general chat for 12 hours.",
            "PUBLIC EXECUTION: Judge can ban them from one specific channel for 24h.",
            "PERMANENT STIGMA: Must keep status as 'I LOST TO THE SYSTEM' for 48h.",
            "DIGITAL DEBT: Must react with a 🤡 to every message the Judge sends for a week.",
            "VOICE REVEAL: Must read the entire Discord Terms of Service out loud in VC.",
            "IDENTITY THEFT: Judge picks a new embarrassing nickname for them for 7 days.",
            "GHOSTED: Entire squad is forbidden from replying to them for 2 hours.",
            "THE GAUNTLET: Must play a game of the Judge's choice until they win 3 times.",
            "SOCIAL BANKRUPTCY: Must gift 1 server boost or post a cringe video dance.",
            "LABOR CAMP: Must invite 5 new bots to their personal test server and configure them.",
            "MEMORY WIPE: Must delete their most recent 100 messages in the server.",
            "TRIAL BY FIRE: Must solo-stream a horror game for 1 hour while the squad watches."
        ]

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections.append(websocket)
        self.user_map[websocket] = user_id
        
        # First person to join becomes the Judge automatically
        if self.state["judge_id"] is None:
            self.state["judge_id"] = user_id
            self._log("The court is now in session. Judge assigned.", "system")
            
        # Send current state immediately
        await websocket.send_text(json.dumps({"type": "update", "data": self.state}))

    async def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            user_id = self.user_map.get(websocket)
            self.active_connections.remove(websocket)
            if websocket in self.user_map:
                del self.user_map[websocket]
            
            # If Judge left, reassign
            if user_id == self.state["judge_id"]:
                if self.active_connections:
                    # Pick next available user
                    new_judge_ws = self.active_connections[0]
                    new_judge_id = self.user_map[new_judge_ws]
                    self.state["judge_id"] = new_judge_id
                    self._log(f"Judge disconnected. New Judge is {new_judge_id}.", "system")
                else:
                    self.state["judge_id"] = None
                    self._cancel_timer()
                    self._log("Judge disconnected. Court adjourned.", "system")
            
            # --- CONTEMPT OF COURT PROTOCOL ---
            # If the ACCUSED leaves while the trial is ACTIVE (no verdict yet)
            if user_id == self.state["accused"].get("id") and self.state["verdict"] is None:
                import random
                self.state["verdict"] = "guilty"
                punishment = random.choice(self.severe_sentences)
                self.state["sentence"] = punishment
                self._cancel_timer()
                self._log(f"CONTEMPT OF COURT! {self.state['accused']['username']} fled. AUTOMATIC GUILTY.", "alert")
                self._log(f"SEVERE SENTENCE: {punishment}", "alert")
                await self.broadcast({"type": "sound", "sound": "gavel"})

            # Broadcast updated state so everyone knows (e.g. if Judge changed)
            await self.broadcast({"type": "update", "data": self.state})

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_text(json.dumps(message))
            except Exception as e:
                handle_error(e, "broadcast")
                pass

    def _log(self, message: str, type: str = "info"):
        """Internal helper to add a log entry"""
        entry = {"message": message, "type": type}
        self.state["logs"].append(entry)
        # Keep logs capped at 50 to prevent overflow
        if len(self.state["logs"]) > 50:
            self.state["logs"].pop(0)

    # --- TIMER LOGIC ---
    def _start_timer(self):
        self._cancel_timer()
        self.state["timer"] = 60
        self._timer_task = asyncio.create_task(self._timer_countdown())

    def _cancel_timer(self):
        if self._timer_task:
            self._timer_task.cancel()
            self._timer_task = None

    async def _timer_countdown(self):
        try:
            while self.state["timer"] > 0:
                await asyncio.sleep(1)
                self.state["timer"] -= 1
                # Broadcast timer update occasionally or every second
                # Optimized: Only broadcast state update, no log spam
                await self.broadcast({"type": "update", "data": self.state})
            
            # Timer finished -> Auto Verdict
            await self._execute_verdict(auto=True)
        except asyncio.CancelledError:
            pass

    async def _execute_verdict(self, auto=False):
        self._cancel_timer()
        g = self.state["votes"]["guilty"]
        i = self.state["votes"]["innocent"]
        
        # Tie-breaker logic for auto-verdict
        if g > i:
            self.state["verdict"] = "guilty"
        else:
            self.state["verdict"] = "innocent"

        await self.broadcast({"type": "sound", "sound": "gavel"})
        
        log_msg = f"Verdict delivered: {self.state['verdict'].upper()}"
        if auto:
            log_msg += " (Time Expired)"
        
        self._log(log_msg, "verdict")
        await self.broadcast({"type": "update", "data": self.state})

    async def handle_message(self, message: dict, user_id: str):
        msg_type = message.get("type")
        username = message.get("username", "Unknown") # Expect username in some payloads
        
        # 1. Voting
        if msg_type == "vote":
            # Rule: Cannot vote if no accused
            if self.state["accused"]["username"] == "Unknown":
                return

            # Rule: One vote per user
            if user_id in self.state["voters"]:
                return

            vote = message.get("vote")
            # Only allow voting if no verdict yet
            if self.state["verdict"] is None and vote in self.state["votes"]:
                self.state["votes"][vote] += 1
                self.state["voters"].append(user_id)
                await self.broadcast({"type": "sound", "sound": "vote"})
        
        # 2. Updating the Crime Text
        elif msg_type == "update_crime":
            crime_text = message.get("crime", "")
            if SecurityService.is_clean(crime_text):
                self.state["crime"] = SecurityService.sanitize(crime_text)
            else:
                # Optionally notify the user or just ignore
                pass
            
        # 2.5 Generate AI Crime
        elif msg_type == "generate_crime":
            if user_id == self.state["judge_id"]:
                import random
                new_crime = random.choice(self.crimes_db)
                self.state["crime"] = new_crime
                self._log("AI Protocol generated a new accusation.", "system")

        # 3. Accusing a User (Judge Only)
        elif msg_type == "accuse_user":
            if user_id == self.state["judge_id"]:
                user_data = message.get("user")
                self.state["accused"] = user_data
                # Ensure the ID is explicitly handled if present in payload
                self.state["accused"]["id"] = user_data.get("id") 
                # Reset round
                self.state["votes"] = {"guilty": 0, "innocent": 0}
                self.state["voters"] = [] # Reset voters
                self.state["verdict"] = None
                self.state["sentence"] = None
                self.state["evidence"] = [] # Clear evidence for new case
                self.state["crime"] = self.state["crime"] if self.state["crime"] != "" else ""
                # Reset witness too
                self.state["witness"] = {"username": None, "avatar": None}
                
                accused_name = self.state["accused"]["username"]
                self._log(f"Judge accused {accused_name}!", "alert")
                
                # START TIMER
                self._start_timer()

        # 3.5 Call a Witness (Judge Only)
        elif msg_type == "call_witness":
            if user_id == self.state["judge_id"]:
                self.state["witness"] = message.get("user")
                witness_name = self.state["witness"]["username"]
                self._log(f"Judge called witness {witness_name} to the stand.", "info")

        # 4. Calling the Verdict (Judge Only)
        elif msg_type == "call_verdict":
            if user_id == self.state["judge_id"]:
                await self._execute_verdict(auto=False)
                
        # 4.5 Pass Sentence (Judge Only - After Guilty)
        elif msg_type == "pass_sentence":
             if user_id == self.state["judge_id"] and self.state["verdict"] == "guilty":
                 import random
                 punishment = random.choice(self.sentences_db)
                 self.state["sentence"] = punishment
                 self._log(f"SENTENCE PASSED: {punishment}", "alert")
                 await self.broadcast({"type": "sound", "sound": "gavel"})

        # 5. Next Case (Judge Only)
        elif msg_type == "next_case":
            if user_id == self.state["judge_id"]:
                self._cancel_timer()
                self.state["votes"] = {"guilty": 0, "innocent": 0}
                self.state["voters"] = [] # Reset voters
                self.state["verdict"] = None
                self.state["sentence"] = None
                self.state["evidence"] = []
                self.state["crime"] = ""
                self.state["witness"] = {"username": None, "avatar": None}
                self.state["accused"] = {"username": "Unknown", "avatar": None}
                self.state["timer"] = 60 # Reset visual timer
                self._log("Case closed. Preparing next case...", "info")

        # 6. OBJECTION! (Anyone)
        elif msg_type == "objection":
            # 10 second global cooldown for objections
            now = time.time()
            if now - self.last_objection_time < 10:
                return 
            
            self.last_objection_time = now
            
            # Broadcast the objection event immediately for visual effects
            await self.broadcast({
                "type": "objection_event", 
                "user_id": user_id, 
                "username": username
            })
            await self.broadcast({"type": "sound", "sound": "objection"})
            self._log(f"OBJECTION! by {username}", "objection")
            # Continue to broadcast state update so the log entry appears live

        # 7. Add Evidence
        elif msg_type == "add_evidence":
            # 3 second per-user cooldown
            now = time.time()
            last_action = self.user_last_action.get(user_id, 0)
            if now - last_action < 3:
                return
            
            evidence_text = message.get("text", "")
            
            # Security: Profanity & Sanitization
            if not SecurityService.is_clean(evidence_text):
                await self.broadcast({"type": "error", "message": "Evidence rejected: Inappropriate content detected."})
                return
            
            self.user_last_action[user_id] = now
            
            new_evidence = {
                "id": len(self.state["evidence"]) + 1,
                "text": SecurityService.sanitize(evidence_text),
                "author": username
            }
            self.state["evidence"].append(new_evidence)
            await self.broadcast({"type": "sound", "sound": "evidence"})
            self._log(f"Evidence submitted by {username}", "evidence")

        # 8. Delete Evidence (Judge Only)
        elif msg_type == "delete_evidence":
            if user_id == self.state["judge_id"]:
                evidence_id = message.get("id")
                self.state["evidence"] = [e for e in self.state["evidence"] if e["id"] != evidence_id]
                self._log("Evidence removed by Judge moderation.", "system")

        # Send updated state to everyone
        await self.broadcast({"type": "update", "data": self.state})

class GameRegistry:
    def __init__(self):
        self._games: Dict[str, GameManager] = {}

    def get_game(self, instance_id: str) -> GameManager:
        if instance_id not in self._games:
            log_info(f"Creating new Game Instance: {instance_id}")
            self._games[instance_id] = GameManager()
        return self._games[instance_id]
    
    def cleanup_game(self, instance_id: str):
        if instance_id in self._games:
            game = self._games[instance_id]
            if len(game.active_connections) == 0:
                log_info(f"Cleaning up empty game: {instance_id}")
                del self._games[instance_id]

registry = GameRegistry()

# --- AUTHENTICATION ---
class TokenRequest(BaseModel):
    code: str
    redirect_uri: str

@app.post("/api/token")
async def exchange_token(request: TokenRequest):
    try:
        data = {
            'client_id': CLIENT_ID,
            'client_secret': CLIENT_SECRET,
            'grant_type': 'authorization_code',
            'code': request.code,
            'redirect_uri': request.redirect_uri,
        }
        headers = {'Content-Type': 'application/x-www-form-urlencoded'}
        
        r = requests.post('https://discord.com/api/oauth2/token', data=data, headers=headers)
        
        if r.status_code != 200:
            log_info(f"Discord Auth Error: {r.text}")
            raise HTTPException(status_code=400, detail=r.json())
        
        return r.json()
    except Exception as e:
        handle_error(e, "token_exchange")
        raise e

# --- WEBSOCKETS ---
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, user_id: str = "anon", instance_id: str = "default"):
    # Get or create the game room for this specific Discord instance
    game = registry.get_game(instance_id)
    
    await game.connect(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                await game.handle_message(json.loads(data), user_id)
            except Exception as e:
                 handle_error(e, "handle_message")
    except WebSocketDisconnect:
        await game.disconnect(websocket)
        registry.cleanup_game(instance_id)
    except Exception as e:
        handle_error(e, "websocket_loop")
        await game.disconnect(websocket)
        registry.cleanup_game(instance_id)