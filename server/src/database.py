"""
Database Service
================
Handles all data persistence for the Compass system.

Stores:
- System prompts for assignments
- Student chat histories
- Assignment metadata
"""

import json
from pathlib import Path
from typing import Optional, List, Dict
from datetime import datetime


class DatabaseService:
    """Service for managing all database operations."""
    
    def __init__(self, db_path: str = "compass_data"):
        """
        Initialize the database service.
        
        Args:
            db_path: Directory path where data will be stored
        """
        self.db_path = Path(db_path)
        self.db_path.mkdir(exist_ok=True)
        
        # Create subdirectories
        self.prompts_path = self.db_path / "prompts"
        self.prompts_path.mkdir(exist_ok=True)
        
        self.chat_histories_path = self.db_path / "chat_histories"
        self.chat_histories_path.mkdir(exist_ok=True)
        
        # Metadata file
        self.metadata_file = self.db_path / "metadata.json"
        if not self.metadata_file.exists():
            self._save_metadata({})
    
    # ========================================================================
    # PROMPT OPERATIONS
    # ========================================================================
    
    def save_prompt(self, assignment_id: str, system_prompt: str, 
                    metadata: Optional[Dict] = None):
        """Save a system prompt for an assignment."""
        prompt_file = self.prompts_path / f"{assignment_id}.txt"
        
        # Save prompt content
        with open(prompt_file, 'w') as f:
            f.write(system_prompt)
        
        # Update metadata
        all_metadata = self._load_metadata()
        all_metadata[assignment_id] = {
            "created_at": datetime.now().isoformat(),
            "course": metadata.get("course", "") if metadata else "",
            "professor": metadata.get("professor", "") if metadata else "",
            "description": metadata.get("description", "") if metadata else "",
            "exam_content": metadata.get("exam_content", "") if metadata else ""
        }
        self._save_metadata(all_metadata)
    
    def load_prompt(self, assignment_id: str) -> Dict:
        """Load a system prompt and its metadata."""
        prompt_file = self.prompts_path / f"{assignment_id}.txt"
        
        if not prompt_file.exists():
            raise FileNotFoundError(f"Prompt not found: {assignment_id}")
        
        with open(prompt_file, 'r') as f:
            prompt_text = f.read()
        
        metadata = self._load_metadata().get(assignment_id, {})
        
        return {
            "assignment_id": assignment_id,
            "system_prompt": prompt_text,
            "metadata": metadata
        }
    
    def list_assignments(self) -> List[Dict]:
        """List all assignments with metadata."""
        metadata = self._load_metadata()
        
        assignments = []
        for assignment_id, data in metadata.items():
            assignments.append({
                "assignment_id": assignment_id,
                **data
            })
        
        return assignments
    
    # ========================================================================
    # CHAT HISTORY OPERATIONS
    # ========================================================================
    
    def save_chat_history(self, student_id: str, assignment_id: str,
                         conversation: List[Dict]):
        """Save a student's chat history."""
        assignment_dir = self.chat_histories_path / assignment_id
        assignment_dir.mkdir(exist_ok=True)
        
        chat_file = assignment_dir / f"{student_id}.json"
        
        chat_data = {
            "student_id": student_id,
            "assignment_id": assignment_id,
            "conversation": conversation,
            "saved_at": datetime.now().isoformat(),
            "total_messages": len(conversation)
        }
        
        with open(chat_file, 'w') as f:
            json.dump(chat_data, f, indent=2)
    
    def load_chat_history(self, student_id: str, assignment_id: str) -> Dict:
        """Load a student's chat history."""
        chat_file = self.chat_histories_path / assignment_id / f"{student_id}.json"
        
        if not chat_file.exists():
            raise FileNotFoundError(
                f"No chat history for {student_id} in {assignment_id}"
            )
        
        with open(chat_file, 'r') as f:
            return json.load(f)
    
    def load_all_chat_histories(self, assignment_id: str) -> List[Dict]:
        """Load all chat histories for an assignment."""
        assignment_dir = self.chat_histories_path / assignment_id
        
        if not assignment_dir.exists():
            return []
        
        histories = []
        for chat_file in assignment_dir.glob("*.json"):
            with open(chat_file, 'r') as f:
                histories.append(json.load(f))
        
        return histories
    
    def list_students_for_assignment(self, assignment_id: str) -> List[str]:
        """List all students who have chat histories for an assignment."""
        assignment_dir = self.chat_histories_path / assignment_id
        
        if not assignment_dir.exists():
            return []
        
        students = []
        for chat_file in assignment_dir.glob("*.json"):
            student_id = chat_file.stem
            students.append(student_id)
        
        return sorted(students)
    
    def get_conversations_for_diagnostics(self, assignment_id: str) -> tuple:
        """
        Load conversations formatted for diagnostics analysis.
        
        Returns:
            (conversations, exam_content) where conversations is a list of
            alternating student/assistant messages
        """
        histories = self.load_all_chat_histories(assignment_id)
        
        conversations = []
        for history in histories:
            messages = []
            for msg in history['conversation']:
                messages.append(msg['content'])
            conversations.append(messages)
        
        # Get exam content from metadata
        metadata = self._load_metadata().get(assignment_id, {})
        exam_content = metadata.get('exam_content', '')
        
        return conversations, exam_content
    
    # ========================================================================
    # PRIVATE HELPERS
    # ========================================================================
    
    def _save_metadata(self, metadata: Dict):
        """Save metadata to file."""
        with open(self.metadata_file, 'w') as f:
            json.dump(metadata, f, indent=2)
    
    def _load_metadata(self) -> Dict:
        """Load metadata from file."""
        with open(self.metadata_file, 'r') as f:
            return json.load(f)