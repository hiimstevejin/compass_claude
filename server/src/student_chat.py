"""
Student Chat Service
===================
Manages student chat sessions during tests/assignments.
"""

from typing import Dict, List, Tuple
from datetime import datetime
from src.llm_client import ClaudeClient
from src.database import DatabaseService


class ChatAgent:
    """
    Stateful chat agent for individual student sessions.
    Maintains conversation history and auto-saves after each message.
    """
    
    def __init__(self, student_id: str, assignment_id: str, 
                 system_prompt: str, db_service: DatabaseService,
                 api_key_file: str = "api_key.txt"):
        """
        Initialize a chat agent for a specific student-assignment pair.
        
        Args:
            student_id: Student identifier
            assignment_id: Assignment identifier
            system_prompt: System prompt for this assignment
            db_service: Database service instance
            api_key_file: Path to Claude API key file
        """
        self.student_id = student_id
        self.assignment_id = assignment_id
        self.system_prompt = system_prompt
        self.db = db_service
        self.llm = ClaudeClient(api_key_file)
        
        # Load existing conversation or start fresh
        try:
            history_data = self.db.load_chat_history(student_id, assignment_id)
            self.conversation = history_data['conversation']
        except FileNotFoundError:
            self.conversation = []
        
        self.session_id = f"{assignment_id}_{student_id}"
    
    def send_message(self, message: str) -> str:
        """
        Send a message and get response. Auto-saves after each exchange.
        
        Args:
            message: Student's message
            
        Returns:
            AI's response
        """
        # Build conversation context
        context = self._build_context(message)
        
        # Generate response
        response = self.llm.generate(
            prompt=context,
            system_prompt=self.system_prompt,
            max_tokens=2048
        )
        
        # Update conversation history
        timestamp = datetime.now().isoformat()
        
        self.conversation.append({
            'role': 'student',
            'content': message,
            'timestamp': timestamp
        })
        
        self.conversation.append({
            'role': 'assistant',
            'content': response,
            'timestamp': timestamp
        })
        
        # Auto-save after each message
        self._save()
        
        return response
    
    def _build_context(self, current_message: str) -> str:
        """Build conversation context for the LLM."""
        if not self.conversation:
            return current_message
        
        context = "\n\nPrevious conversation:\n"
        for msg in self.conversation:
            role = msg['role'].capitalize()
            content = msg['content']
            context += f"{role}: {content}\n"
        
        context += f"\nStudent: {current_message}"
        return context
    
    def _save(self):
        """Save conversation to database."""
        self.db.save_chat_history(
            self.student_id,
            self.assignment_id,
            self.conversation
        )
    
    def get_history(self) -> List[Dict]:
        """Get full conversation history."""
        return self.conversation


class StudentChatService:
    """Service for handling student chat interactions."""
    
    def __init__(self, db: DatabaseService, api_key_file: str = "api_key.txt"):
        """
        Initialize the chat service.
        
        Args:
            db: Database service instance
            api_key_file: Path to Claude API key file
        """
        self.db = db
        self.llm = ClaudeClient(api_key_file)
        
        # Active sessions: {(student_id, assignment_id): conversation_history}
        self.active_sessions = {}
    
    def send_message(self, student_id: str, assignment_id: str, 
                    message: str) -> Tuple[str, str]:
        """
        Process a student message and return a response.
        
        Args:
            student_id: Student identifier
            assignment_id: Assignment identifier  
            message: Student's message
            
        Returns:
            (response_text, session_id)
        """
        # Get or create session
        session_key = (student_id, assignment_id)
        
        if session_key not in self.active_sessions:
            # Load existing history or start new
            try:
                history_data = self.db.load_chat_history(student_id, assignment_id)
                self.active_sessions[session_key] = history_data['conversation']
            except FileNotFoundError:
                self.active_sessions[session_key] = []
        
        conversation = self.active_sessions[session_key]
        
        # Load system prompt
        prompt_data = self.db.load_prompt(assignment_id)
        system_prompt = prompt_data['system_prompt']
        
        # Build conversation context
        context = self._build_context(conversation, message)
        
        # Generate response
        response = self.llm.generate(
            prompt=context,
            system_prompt=system_prompt,
            max_tokens=2048
        )
        
        # Update conversation history
        timestamp = datetime.now().isoformat()
        
        conversation.append({
            'role': 'student',
            'content': message,
            'timestamp': timestamp
        })
        
        conversation.append({
            'role': 'assistant',
            'content': response,
            'timestamp': timestamp
        })
        
        # Save to database
        self.db.save_chat_history(student_id, assignment_id, conversation)
        
        session_id = f"{assignment_id}_{student_id}"
        return response, session_id
    
    def get_history(self, student_id: str, assignment_id: str) -> Dict:
        """Get chat history for a student."""
        return self.db.load_chat_history(student_id, assignment_id)
    
    def _build_context(self, conversation: List[Dict], current_message: str) -> str:
        """Build conversation context for the LLM."""
        if not conversation:
            return current_message
        
        context = "\n\nPrevious conversation:\n"
        for msg in conversation:
            role = msg['role'].capitalize()
            content = msg['content']
            context += f"{role}: {content}\n"
        
        context += f"\nStudent: {current_message}"
        return context