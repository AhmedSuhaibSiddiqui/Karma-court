import os
import requests
import json
import random
import time
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

class DiscordBot:
    def __init__(self):
        self.bot_token = os.getenv("DISCORD_BOT_TOKEN")
        self.base_url = "https://discord.com/api/v10"

    def _get_case_id(self):
        """Generates a pseudo-random Case ID based on time."""
        return f"CASE-{int(time.time()) % 10000:04d}"

    def send_case_start_embed(self, channel_id: str, game_state: dict):
        if not self.bot_token: self.bot_token = os.getenv("DISCORD_BOT_TOKEN")
        if not self.bot_token or not channel_id: return

        target_id = os.getenv("FORCE_CHANNEL_ID") or channel_id
        url = f"{self.base_url}/channels/{target_id}/messages"
        
        accused = game_state.get("accused", {}).get("username", "Unknown")
        accused_avatar = game_state.get("accused", {}).get("avatar") or "https://cdn.discordapp.com/embed/avatars/0.png"
        crime = game_state.get("crime", "Unspecified Crimes")
        case_id = self._get_case_id()

        embed = {
            "title": "⚖️ THE HIGH COURT IS IN SESSION",
            "description": f"> *All rise for the Honorable Judge. The court will now hear the case of **{accused}**.*",
            "color": 0xFF00FF, # Neon Pink
            "fields": [
                {
                    "name": "👤 The Accused",
                    "value": f"**{accused}**",
                    "inline": True
                },
                {
                    "name": "🆔 Case Number",
                    "value": f"`{case_id}`",
                    "inline": True
                },
                {
                    "name": "📜 The Charge",
                    "value": f"```diff\n- {crime}\n```",
                    "inline": False
                },
                {
                    "name": "📢 Current Status",
                    "value": "Trial proceeding to opening statements. Witnesses are being summoned.",
                    "inline": False
                }
            ],
            "thumbnail": {"url": accused_avatar},
            "image": {"url": "https://media1.tenor.com/m/fW05-pGk6mQAAAAC/ace-attorney-phoenix-wright.gif"}, # Optional dynamic flair
            "footer": {"text": "Karma Court • Justice In Real-Time"}
        }
        
        self._post(url, embed, target_id)

    def send_witness_embed(self, channel_id: str, game_state: dict):
        if not self.bot_token: self.bot_token = os.getenv("DISCORD_BOT_TOKEN")
        if not self.bot_token or not channel_id: return

        target_id = os.getenv("FORCE_CHANNEL_ID") or channel_id
        url = f"{self.base_url}/channels/{target_id}/messages"
        witness = game_state.get("witness", {}).get("username", "Unknown Witness")
        witness_avatar = game_state.get("witness", {}).get("avatar") or "https://cdn.discordapp.com/embed/avatars/0.png"

        embed = {
            "title": "👁️ WITNESS CALLED TO THE STAND",
            "description": f"> *The court summons **{witness}** to provide testimony.*",
            "color": 0xFCEE0A, # Neon Yellow
            "fields": [
                {
                    "name": "🗣️ Testimony In Progress",
                    "value": "Please provide your account of the events.",
                    "inline": False
                }
            ],
            "thumbnail": {"url": witness_avatar},
            "footer": {"text": "Karma Court • Sworn Testimony"}
        }
        self._post(url, embed, target_id)

    def send_objection_embed(self, channel_id: str, username: str):
        if not self.bot_token: self.bot_token = os.getenv("DISCORD_BOT_TOKEN")
        if not self.bot_token or not channel_id: return

        target_id = os.getenv("FORCE_CHANNEL_ID") or channel_id
        url = f"{self.base_url}/channels/{target_id}/messages"
        
        embed = {
            "title": "💥 OBJECTION!",
            "description": f"### {username} has interrupted the proceedings!",
            "color": 0xFF3300, # Neon Red-Orange
            "image": {"url": "https://media.tenor.com/Fw_iS_Mub30AAAAC/objection-ace-attorney.gif"},
            "footer": {"text": "Karma Court • Order In The Court!"}
        }

        self._post(url, embed, target_id)

    def send_verdict_embed(self, channel_id: str, game_state: dict):
        if not self.bot_token: self.bot_token = os.getenv("DISCORD_BOT_TOKEN")
        if not self.bot_token or not channel_id: return

        target_id = os.getenv("FORCE_CHANNEL_ID") or channel_id
        url = f"{self.base_url}/channels/{target_id}/messages"
        
        accused = game_state.get("accused", {}).get("username", "Unknown")
        accused_avatar = game_state.get("accused", {}).get("avatar") or "https://cdn.discordapp.com/embed/avatars/0.png"
        crime = game_state.get("crime", "Unspecified Crimes")
        verdict_raw = game_state.get("verdict", "PENDING")
        verdict = verdict_raw.upper()
        sentence = game_state.get("sentence")
        
        guilty_votes = game_state["votes"]["guilty"]
        innocent_votes = game_state["votes"]["innocent"]
        total = guilty_votes + innocent_votes
        
        # Dynamic Vote Bar
        bar_len = 12
        if total > 0:
            filled = int((guilty_votes / total) * bar_len)
        else:
            filled = bar_len // 2
        
        empty = bar_len - filled
        # Custom progress bar: [🟥🟥🟥🟥⬜⬜⬜⬜]
        vote_bar = "🟥" * filled + "🟦" * empty

        # Styling based on Verdict
        if verdict == "GUILTY":
            color = 0xFF3333 # Neon Red
            title_icon = "🚨"
            verdict_display = f"```diff\n- {verdict} -\n```"
            image_url = "https://media.tenor.com/images/3a9a1d3a5a1d3a5a1d3a5a1d3a5a1d3a/tenor.gif" # Placeholder for Guilty Slam
        else:
            color = 0x00F3FF # Neon Blue
            title_icon = "🛡️"
            verdict_display = f"```yaml\n{verdict}\n```"
            image_url = ""

        fields = [
            {
                "name": "👤 The Accused",
                "value": f"**{accused}**",
                "inline": True
            },
            {
                "name": "📜 The Charge",
                "value": f"*{crime}*",
                "inline": True
            },
            {
                "name": "⚖️ The Scale of Justice",
                "value": f"{vote_bar}\n**Guilty: {guilty_votes}**  vs  **Innocent: {innocent_votes}**",
                "inline": False
            }
        ]

        if verdict == "GUILTY" and sentence:
            fields.append({
                "name": "🔨 JUDICIAL SENTENCE",
                "value": f"> **{sentence}**",
                "inline": False
            })

        embed = {
            "title": f"{title_icon} FINAL VERDICT DELIVERED",
            "description": f"The Jury has deliberated and the verdict is in.\n{verdict_display}",
            "color": color,
            "fields": fields,
            "thumbnail": {"url": accused_avatar},
            "footer": {"text": f"Karma Court • Justice Served • {datetime.utcnow().strftime('%Y-%m-%d')}"}
        }

        self._post(url, embed, target_id)

    def send_evidence_embed(self, channel_id: str, evidence_item: dict):
        if not self.bot_token: self.bot_token = os.getenv("DISCORD_BOT_TOKEN")
        if not self.bot_token or not channel_id: return

        target_id = os.getenv("FORCE_CHANNEL_ID") or channel_id
        url = f"{self.base_url}/channels/{target_id}/messages"
        
        text = evidence_item.get("text", "")
        author = evidence_item.get("author", "Unknown")
        exhibit_id = f"EXHIBIT-{random.choice(['A','B','C','D'])}-{random.randint(10,99)}"

        embed = {
            "title": "📂 NEW EVIDENCE SUBMITTED",
            "color": 0x00FF66, # Neon Green
            "description": f"```{text}```",
            "fields": [
                {
                    "name": "🆔 Exhibit ID",
                    "value": f"`{exhibit_id}`",
                    "inline": True
                },
                {
                    "name": "🕵️ Submitted By",
                    "value": f"**{author}**",
                    "inline": True
                }
            ],
            "footer": {"text": "Karma Court • Court Record Updated"}
        }

        self._post(url, embed, target_id)

    def _post(self, url, embed, channel_id):
        if not self.bot_token:
            print("❌ Discord Bot Error: No Bot Token found.")
            return

        headers = {
            "Authorization": f"Bot {self.bot_token}",
            "Content-Type": "application/json"
        }
        try:
            r = requests.post(url, headers=headers, json={"embeds": [embed]})
            if r.status_code in [200, 201, 204]:
                print(f"✅ Embed sent successfully to channel: {channel_id}")
            else:
                print(f"❌ Failed to send. Status: {r.status_code} | Response: {r.text}")
        except Exception as e:
            print(f"❌ Error sending Discord Embed: {e}")

bot_client = DiscordBot()
