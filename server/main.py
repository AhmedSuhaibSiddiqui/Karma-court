import os
import requests
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from typing import List, Dict
import json

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
        self.state = {
            "votes": {"guilty": 0, "innocent": 0},
            "crime": "Waiting for accusation...",
            "verdict": None, # 'guilty' | 'innocent' | None
            "judge_id": None,
            "accused": {
                "username": "Unknown",
                "avatar": None
            },
            "evidence": [], # List of {id, type, content, author}
            "logs": []      # List of {timestamp, message, type}
        }

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

    def disconnect(self, websocket: WebSocket):
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
                    self._log("Judge disconnected. Court adjourned.", "system")

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_text(json.dumps(message))
            except:
                # We let the disconnect handler deal with it eventually, 
                # or just pass here to avoid modification during iteration issues
                pass

    def _log(self, message: str, type: str = "info"):
        """Internal helper to add a log entry"""
        entry = {"message": message, "type": type}
        self.state["logs"].append(entry)
        # Keep logs capped at 50 to prevent overflow
        if len(self.state["logs"]) > 50:
            self.state["logs"].pop(0)

    async def handle_message(self, message: dict, user_id: str):
        msg_type = message.get("type")
        username = message.get("username", "Unknown") # Expect username in some payloads
        
        # 1. Voting
        if msg_type == "vote":
            vote = message.get("vote")
            # Only allow voting if no verdict yet
            if self.state["verdict"] is None and vote in self.state["votes"]:
                self.state["votes"][vote] += 1
                await self.broadcast({"type": "sound", "sound": "vote"})
        
        # 2. Updating the Crime Text
        elif msg_type == "update_crime":
            self.state["crime"] = message.get("crime")

        # 3. Accusing a User (Judge Only)
        elif msg_type == "accuse_user":
            if user_id == self.state["judge_id"]:
                self.state["accused"] = message.get("user")
                # Reset round
                self.state["votes"] = {"guilty": 0, "innocent": 0}
                self.state["verdict"] = None
                self.state["evidence"] = [] # Clear evidence for new case
                self.state["crime"] = "Waiting for accusation..."
                
                accused_name = self.state["accused"]["username"]
                self._log(f"Judge accused {accused_name}!", "alert")

        # 4. Calling the Verdict (Judge Only)
        elif msg_type == "call_verdict":
            if user_id == self.state["judge_id"]:
                g = self.state["votes"]["guilty"]
                i = self.state["votes"]["innocent"]
                self.state["verdict"] = "guilty" if g >= i else "innocent"
                await self.broadcast({"type": "sound", "sound": "gavel"})
                self._log(f"Verdict delivered: {self.state['verdict'].upper()}", "verdict")

        # 5. Next Case (Judge Only)
        elif msg_type == "next_case":
            if user_id == self.state["judge_id"]:
                self.state["votes"] = {"guilty": 0, "innocent": 0}
                self.state["verdict"] = None
                self.state["evidence"] = []
                self.state["crime"] = "Enter new accusation..."
                self._log("Case closed. Preparing next case...", "info")

        # 6. OBJECTION! (Anyone)
        elif msg_type == "objection":
            # Broadcast the objection event immediately for visual effects
            await self.broadcast({
                "type": "objection_event", 
                "user_id": user_id, 
                "username": username
            })
            await self.broadcast({"type": "sound", "sound": "objection"})
            self._log(f"OBJECTION! by {username}", "objection")
            return # Special case: we also want to send the update, so continue below

        # 7. Add Evidence
        elif msg_type == "add_evidence":
            new_evidence = {
                "id": len(self.state["evidence"]) + 1,
                "text": message.get("text"),
                "author": username
            }
            self.state["evidence"].append(new_evidence)
            self._log(f"Evidence submitted by {username}", "evidence")

        # Send updated state to everyone
        await self.broadcast({"type": "update", "data": self.state})

manager = GameManager()

# --- AUTHENTICATION ---
class TokenRequest(BaseModel):
    code: str
    redirect_uri: str

@app.post("/api/token")
async def exchange_token(request: TokenRequest):
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
        print(f"Discord Auth Error: {r.text}")
        raise HTTPException(status_code=400, detail=r.json())
    
    return r.json()

# --- WEBSOCKETS ---
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, user_id: str = "anon"):
    await manager.connect(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_text()
            await manager.handle_message(json.loads(data), user_id)
    except WebSocketDisconnect:
        manager.disconnect(websocket)