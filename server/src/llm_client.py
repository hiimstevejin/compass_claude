"""
Language Model Client
=====================
Wrapper for the Claude API.
"""

import anthropic
from pathlib import Path


class ClaudeClient:
    """Client for interacting with Claude API."""
    
    def __init__(self, api_key_file: str = "api_key.txt"):
        """
        Initialize the Claude client.
        
        Args:
            api_key_file: Path to file containing API key
        """
        self.api_key = self._load_api_key(api_key_file)
        self.client = anthropic.Anthropic(api_key=self.api_key)
    
    def _load_api_key(self, api_key_file: str) -> str:
        """Load API key from file."""
        key_path = Path(api_key_file)
        
        if not key_path.exists():
            raise FileNotFoundError(f"API key file not found: {api_key_file}")
        
        api_key = key_path.read_text().strip()
        
        if not api_key:
            raise ValueError(f"API key file is empty: {api_key_file}")
        
        return api_key
    
    def generate(self, 
                prompt: str, 
                system_prompt: str = "", 
                model: str = "claude-sonnet-4-20250514",
                max_tokens: int = 4096) -> str:
        """
        Generate a completion from Claude.
        
        Args:
            prompt: User prompt
            system_prompt: System prompt for context
            model: Claude model to use
            max_tokens: Maximum tokens in response
            
        Returns:
            Generated text response
        """
        message_params = {
            "model": model,
            "max_tokens": max_tokens,
            "messages": [
                {"role": "user", "content": prompt}
            ]
        }
        
        if system_prompt:
            message_params["system"] = system_prompt
        
        response = self.client.messages.create(**message_params)
        return response.content[0].text