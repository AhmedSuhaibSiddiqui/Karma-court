import re

class SecurityService:
    # Basic filter - in a real prod app, use a comprehensive library
    BANNED_WORDS = [
        "badword1", "badword2", "spam", "toxic" # Add common profanity here
    ]

    @classmethod
    def is_clean(cls, text: str) -> bool:
        """Checks if text contains banned words."""
        if not text:
            return True
        
        # Simple case-insensitive check
        text_lower = text.lower()
        for word in cls.BANNED_WORDS:
            if re.search(rf"\b{word}\b", text_lower):
                return False
        return True

    @classmethod
    def sanitize(cls, text: str) -> str:
        """Removes potential script tags or malicious characters."""
        return re.sub(r'<[^>]*?>', '', text)
