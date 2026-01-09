from fastapi.staticfiles import StaticFiles
import os
import requests
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Request, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from typing import List, Dict, Optional
import json
import time
from nacl.signing import VerifyKey
from nacl.exceptions import BadSignatureError
from utils.error_handler import handle_error, log_info
from utils.security import SecurityService
from utils.discord_bot import bot_client

# 1. Load Secrets
load_dotenv()
CLIENT_ID = os.getenv("DISCORD_CLIENT_ID")
CLIENT_SECRET = os.getenv("DISCORD_CLIENT_SECRET")
DISCORD_PUBLIC_KEY = os.getenv("DISCORD_PUBLIC_KEY")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    # Allow local development and Discord's activity domains
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "https://discord.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- GAME REGISTRY (GLOBAL) ---
class GameRegistry:
    def __init__(self):
        self._games: Dict[str, 'GameManager'] = {}
        self.pending_cases: Dict[str, dict] = {} # channel_id -> case_data

    def get_game(self, instance_id: str) -> 'GameManager':
        if instance_id not in self._games: self._games[instance_id] = GameManager()
        return self._games[instance_id]
    
    def cleanup_game(self, instance_id: str):
        if instance_id in self._games and not self._games[instance_id].active_connections: del self._games[instance_id]

registry = GameRegistry()

# --- GAME STATE MANAGER ---
class GameManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.user_map: Dict[WebSocket, str] = {} # Map WS -> user_id
        self._timer_task: Optional[asyncio.Task] = None
        self.channel_id: Optional[str] = None
        
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
        
        # --- DATA BANKS ---
        self.crimes_db = [
            "Posting cringe in #general", "Ghosting the squad for 3 weeks", "Eating chips with an open mic",
            "Using light mode unironically", "Backseat gaming during a clutch", "Pronouncing 'GIF' wrong",
            "Spamming @everyone for no reason", "Not boosting the server", "Playing music bot at 200% volume",
            "Stealing the last kill", "Being AFK during the ready check", "Having a chaotic desktop",
            "Not saying 'GG' after a loss", "Simping too hard", "Using comic sans", "Replying 'k' to a long paragraph",
            "Leaving only 1 second on the microwave", "Spoiling the movie ending 'by accident'",
            "Using 'Reply All' on a company-wide email", "Chewing loudly in voice chat",
            "Not cropping the meme before posting", "Sending voice messages longer than 2 minutes",
            "Asking a question that was just answered", "Linking a 30-minute YouTube video without a timestamp",
            "Saying 'I'm down' then sleeping immediately"
        ]
        
        self.sentences_db = [
            "Must change nickname to 'Clown' for 24h", "Banned from using vowels in chat for 10m",
            "Must sing an apology song in VC", "Forced to use Light Mode for 5 minutes",
            "Must post a cringe selfie", "Cannot speak for 3 rounds", "Must compliment the Judge for 1 minute",
            "Sentenced to play League of Legends", "Publicly shamed in #announcements",
            "Must end every sentence with 'uwu' for 1 hour", "Forced to use a default Discord avatar for a week",
            "Banned from using emojis for 24 hours", "Must change status to 'I love Nickelback'",
            "Cannot mute mic for the next 30 minutes", "Must write a haiku about their crime",
            "Sentenced to be the server's personal butler for a day", "Must react to every message with a clown emoji",
            "Forced to stream their desktop while organizing it", "Must use 'Comic Sans' logic in all arguments",
            "Cannot say the word 'the' for 10 minutes", "Must send a heartfelt apology to a bot",
            "Required to narrate their own actions in 3rd person", "Banned from sharing memes for 48 hours",
            "Must wear a virtual 'Cone of Shame' (Status)", "Sentenced to explain FNAF lore to the chat",
            "Must reply with a GIF to every message for 10m", "Forced to listen to 1 hour of elevator music"
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

    async def connect(self, websocket: WebSocket, user_id: str, channel_id: Optional[str] = None):
        await websocket.accept()
        self.active_connections.append(websocket)
        self.user_map[websocket] = user_id
        
        print(f"🔌 Connection: User={user_id} | Channel ID={channel_id}") # Debug Log

        # Load Pending Case from Slash Command
        if channel_id:
            self.channel_id = channel_id
            if channel_id in registry.pending_cases:
                case = registry.pending_cases.pop(channel_id)
                self.state["accused"] = case["accused"]
                self.state["crime"] = case["crime"]
                self.state["votes"] = {"guilty": 0, "innocent": 0}
                self.state["voters"] = []
                self.state["verdict"] = None
                self._log("OPENING PENDING CASE FILE...", "system")
                self._log(f"ACCUSED: {self.state['accused']['username']}", "alert")
                self._start_timer()

        if self.state["judge_id"] is None:
            self.state["judge_id"] = user_id
            self._log("The court is now in session. Judge assigned.", "system")
        await websocket.send_text(json.dumps({"type": "update", "data": self.state}))

    async def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            user_id = self.user_map.get(websocket)
            self.active_connections.remove(websocket)
            if websocket in self.user_map: del self.user_map[websocket]
            if user_id == self.state["judge_id"]:
                if self.active_connections:
                    new_judge_ws = self.active_connections[0]
                    new_judge_id = self.user_map[new_judge_ws]
                    self.state["judge_id"] = new_judge_id
                    self._log(f"Judge disconnected. New Judge is {new_judge_id}.", "system")
                else:
                    self.state["judge_id"] = None
                    self._cancel_timer()
                    self._log("Judge disconnected. Court adjourned.", "system")
            if user_id == self.state["accused"].get("id") and self.state["verdict"] is None:
                import random
                self.state["verdict"] = "guilty"
                punishment = random.choice(self.severe_sentences)
                self.state["sentence"] = punishment
                self._cancel_timer()
                self._log(f"CONTEMPT OF COURT! {self.state['accused']['username']} fled. AUTOMATIC GUILTY.", "alert")
                self._log(f"SEVERE SENTENCE: {punishment}", "alert")
                await self.broadcast({"type": "sound", "sound": "gavel"})
                if self.channel_id:
                    bot_client.send_verdict_embed(self.channel_id, self.state)
            await self.broadcast({"type": "update", "data": self.state})

    async def broadcast(self, message: dict):
        if not self.active_connections: return
        
        json_msg = json.dumps(message)
        async def send(ws):
            try: await ws.send_text(json_msg)
            except Exception as e: handle_error(e, "broadcast_one")

        await asyncio.gather(*(send(ws) for ws in self.active_connections))

    def _log(self, message: str, type: str = "info"):
        entry = {"message": message, "type": type}
        self.state["logs"].append(entry)
        if len(self.state["logs"]) > 50: self.state["logs"].pop(0)

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
                await self.broadcast({"type": "update", "data": self.state})
            await self._execute_verdict(auto=True)
        except asyncio.CancelledError: pass

    async def _execute_verdict(self, auto=False):
        self._cancel_timer()
        g, i = self.state["votes"]["guilty"], self.state["votes"]["innocent"]
        self.state["verdict"] = "guilty" if g > i else "innocent"
        await self.broadcast({"type": "sound", "sound": "gavel"})
        log_msg = f"Verdict delivered: {self.state['verdict'].upper()}"
        if auto: log_msg += " (Time Expired)"
        self._log(log_msg, "verdict")
        await self.broadcast({"type": "update", "data": self.state})
        
        # Trigger Discord Embed
        # Only send immediately if Innocent (no sentence phase)
        if self.channel_id and self.state['verdict'] == 'innocent':
            bot_client.send_verdict_embed(self.channel_id, self.state)

    async def handle_message(self, message: dict, user_id: str):
        msg_type = message.get("type")
        username = message.get("username", "Unknown")
        
        # 1. Voting
        if msg_type == "vote":
            if self.state["accused"]["username"] != "Unknown" and user_id not in self.state["voters"]:
                vote = message.get("vote")
                if self.state["verdict"] is None and vote in self.state["votes"]:
                    self.state["votes"][vote] += 1
                    self.state["voters"].append(user_id)
                    await self.broadcast({"type": "sound", "sound": "vote"})
        
        # 2. Updating the Crime Text
        elif msg_type == "update_crime":
            if user_id == self.state["judge_id"]:
                crime_text = message.get("crime", "")[:100]
                if SecurityService.is_clean(crime_text):
                    self.state["crime"] = SecurityService.sanitize(crime_text)
            
        # 2.5 Generate AI Crime
        elif msg_type == "generate_crime":
            if user_id == self.state["judge_id"]:
                import random
                self.state["crime"] = random.choice(self.crimes_db)
                self._log("AI Protocol generated a new accusation.", "system")
                await self.broadcast({"type": "sound", "sound": "vote"}) # Use vote sound as feedback

        # 3. Accusing a User
        elif msg_type == "accuse_user":
            if user_id == self.state["judge_id"]:
                print(f"⚖️ ACTION: Accuse User | Judge: {user_id} | Channel: {self.channel_id}")
                user_data = message.get("user")
                self.state["accused"] = user_data
                self.state["accused"]["id"] = user_data.get("id") 
                self.state["votes"] = {"guilty": 0, "innocent": 0}
                self.state["voters"] = []
                self.state["verdict"] = None
                self.state["sentence"] = None
                self.state["evidence"] = []
                self.state["crime"] = self.state["crime"][:100]
                self.state["witness"] = {"username": None, "avatar": None}
                self._log(f"Judge accused {self.state['accused']['username']}!", "alert")
                self._start_timer()
                if self.channel_id:
                    print("📤 Triggering Accusation Embed...")
                    bot_client.send_case_start_embed(self.channel_id, self.state)
                else:
                    print("❌ No Channel ID for Accusation Embed")

        # 3.5 Call a Witness
        elif msg_type == "call_witness":
            if user_id == self.state["judge_id"]:
                print(f"⚖️ ACTION: Call Witness | Judge: {user_id}")
                self.state["witness"] = message.get("user")
                self._log(f"Judge called witness {self.state['witness']['username']} to the stand.", "info")
                if self.channel_id:
                    bot_client.send_witness_embed(self.channel_id, self.state)

        # 4. Calling the Verdict
        elif msg_type == "call_verdict":
            if user_id == self.state["judge_id"]:
                await self._execute_verdict(auto=False)
                
        # 4.5 Pass Sentence
        elif msg_type == "pass_sentence":
             print(f"⚖️ ACTION: Pass Sentence | User: {user_id} | Judge: {self.state['judge_id']} | Verdict: {self.state['verdict']}")
             if user_id == self.state["judge_id"] and self.state["verdict"] == "guilty":
                 import random
                 self.state["sentence"] = random.choice(self.sentences_db)
                 self._log(f"SENTENCE PASSED: {self.state['sentence']}", "alert")
                 await self.broadcast({"type": "sound", "sound": "gavel"})
                 if self.channel_id:
                     print(f"📤 Triggering Punishment Embed for Channel {self.channel_id}")
                     bot_client.send_verdict_embed(self.channel_id, self.state)
                 else:
                     print("❌ Cannot send Punishment Embed: No Channel ID linked.")

        # 5. Next Case
        elif msg_type == "next_case":
            if user_id == self.state["judge_id"]:
                self._cancel_timer()
                self.state["votes"] = {"guilty": 0, "innocent": 0}
                self.state["voters"], self.state["verdict"], self.state["sentence"], self.state["evidence"] = [], None, None, []
                self.state["crime"] = ""
                self.state["witness"], self.state["accused"] = {"username": None, "avatar": None}, {"username": "Unknown", "avatar": None}
                self.state["timer"] = 60
                self._log("Case closed. Preparing next case...", "info")

        # 6. OBJECTION!
        elif msg_type == "objection":
            now = time.time()
            if now - self.last_objection_time >= 10:
                self.last_objection_time = now
                await self.broadcast({"type": "objection_event", "user_id": user_id, "username": username})
                await self.broadcast({"type": "sound", "sound": "objection"})
                self._log(f"OBJECTION! by {username}", "objection")
                if self.channel_id:
                    bot_client.send_objection_embed(self.channel_id, username)

        # 7. Add Evidence
        elif msg_type == "add_evidence":
            now = time.time()
            if now - self.user_last_action.get(user_id, 0) >= 3:
                evidence_text = message.get("text", "")[:100]
                if SecurityService.is_clean(evidence_text):
                    self.user_last_action[user_id] = now
                    new_ev = {"id": len(self.state["evidence"]) + 1, "text": SecurityService.sanitize(evidence_text), "author": username}
                    self.state["evidence"].append(new_ev)
                    await self.broadcast({"type": "sound", "sound": "evidence"})
                    self._log(f"Evidence submitted by {username}", "evidence")
                    
                    if self.channel_id:
                        bot_client.send_evidence_embed(self.channel_id, new_ev)
                else:
                    await self.broadcast({"type": "error", "message": "Evidence rejected: Inappropriate content."})

        # 8. Delete Evidence
        elif msg_type == "delete_evidence":
            if user_id == self.state["judge_id"]:
                ev_id = message.get("id")
                self.state["evidence"] = [e for e in self.state["evidence"] if e["id"] != ev_id]
                self._log("Evidence removed by Judge moderation.", "system")

        await self.broadcast({"type": "update", "data": self.state})


class TokenRequest(BaseModel):
    code: str
    redirect_uri: str

@app.post("/api/token")
async def exchange_token(request: TokenRequest):
    try:
        data = {'client_id': CLIENT_ID, 'client_secret': CLIENT_SECRET, 'grant_type': 'authorization_code', 'code': request.code, 'redirect_uri': request.redirect_uri}
        r = requests.post('https://discord.com/api/oauth2/token', data=data, headers={'Content-Type': 'application/x-www-form-urlencoded'})
        if r.status_code != 200: raise HTTPException(status_code=400, detail=r.json())
        return r.json()
    except Exception as e:
        handle_error(e, "token_exchange")
        raise e

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, user_id: str = "anon", instance_id: str = "default", channel_id: Optional[str] = None):
    game = registry.get_game(instance_id)
    await game.connect(websocket, user_id, channel_id)
    try:
        while True:
            data = await websocket.receive_text()
            try: await game.handle_message(json.loads(data), user_id)
            except Exception as e: handle_error(e, "handle_message")
    except WebSocketDisconnect: await game.disconnect(websocket)
    except Exception as e:
        handle_error(e, "websocket_loop")
        await game.disconnect(websocket)
    finally: registry.cleanup_game(instance_id)

# --- DISCORD INTERACTIONS (SLASH COMMANDS) ---
@app.post("/api/interactions")
async def discord_interaction(request: Request):
    # 1. Verification
    signature = request.headers.get("X-Signature-Ed25519")
    timestamp = request.headers.get("X-Signature-Timestamp")
    body = await request.body()
    
    if not signature or not timestamp or not DISCORD_PUBLIC_KEY:
        return JSONResponse(status_code=401, content="Invalid Request Signature")

    try:
        verify_key = VerifyKey(bytes.fromhex(DISCORD_PUBLIC_KEY))
        verify_key.verify(f'{timestamp}{body.decode("utf-8")}'.encode(), bytes.fromhex(signature))
    except BadSignatureError:
        return JSONResponse(status_code=401, content="Invalid Request Signature")

    # 2. Handle Payload
    data = json.loads(body)
    type_ = data.get("type")

    # PING
    if type_ == 1:
        return JSONResponse({"type": 1})

    # APPLICATION COMMAND
    if type_ == 2:
        cmd_name = data.get("data", {}).get("name")
        channel_id = data.get("channel_id")
        
        if cmd_name == "accuse":
            # Extract Options
            options = data.get("data", {}).get("options", [])
            accused_user = None
            reason = "Unspecified Crimes"
            
            for opt in options:
                if opt["name"] == "user":
                    user_id = opt["value"]
                    # Resolve User Object (Discord provides resolved data)
                    resolved = data.get("data", {}).get("resolved", {}).get("users", {}).get(user_id, {})
                    accused_user = {
                        "id": user_id,
                        "username": resolved.get("username", "Unknown"),
                        "avatar": resolved.get("avatar")
                    }
                elif opt["name"] == "reason":
                    reason = opt["value"]

            # Store Pending Case
            if accused_user and channel_id:
                registry.pending_cases[channel_id] = {
                    "accused": accused_user,
                    "crime": reason
                }

            # Response Embed
            return JSONResponse({
                "type": 4, # CHANNEL_MESSAGE_WITH_SOURCE
                "data": {
                    "embeds": [{
                        "title": "🚨 CASE FILED!",
                        "description": f"**Docket #{int(time.time()) % 10000} is now open.**\nLaunch the Activity to begin the trial immediately.",
                        "color": 0xFF9900,
                        "fields": [{"name": "Defendant", "value": f"<@{accused_user['id']}>", "inline": True}, {"name": "Charge", "value": reason, "inline": True}],
                        "footer": {"text": "Karma Court • Justice Awaits"}
                    }]
                }
            })

    return JSONResponse({"error": "Unknown Command"}, status_code=400)

# Serve React Frontend (MUST BE LAST)
# Ensure the directory exists or this will error locally if not built.
if os.path.exists("../client/dist"):
    app.mount("/", StaticFiles(directory="../client/dist", html=True), name="static")