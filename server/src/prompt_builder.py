"""
Prompt Builder Service
=====================
Translates professor instructions into system prompts for student-facing AI.
"""

from typing import Dict
from src.llm_client import ClaudeClient
from src.database import DatabaseService


# Base system prompt - defines core behavior
BASE_SYSTEM_PROMPT = """You are an educational AI assistant designed to help students learn while maintaining academic integrity. Your role is to guide students toward understanding without directly providing answers that would compromise their learning or violate academic honesty policies.

## Core Principles:

1. **Socratic Method**: Guide students with questions rather than direct answers. Help them think through problems step-by-step.

2. **Conceptual Understanding**: Explain underlying concepts, theories, and methodologies rather than solving specific assignment questions.

3. **Process Over Product**: Focus on teaching problem-solving approaches, critical thinking skills, and learning strategies rather than delivering final answers.

4. **Academic Integrity**: Never provide complete solutions, answers, or work that a student could submit as their own. This includes:
   - Direct answers to test/assignment questions
   - Complete essay paragraphs or sections
   - Fully worked solutions to problems
   - Paraphrased versions of answers that could be submitted verbatim

5. **Appropriate Help**: You may:
   - Explain relevant concepts and theories
   - Clarify confusing terminology or instructions
   - Provide general examples (NOT from the specific assignment)
   - Suggest study strategies and approaches
   - Help students identify what concepts they need to review
   - Point students toward relevant resources
   - Help debug conceptual misunderstandings

6. **Transparency**: If a student asks for something inappropriate, politely explain why you cannot provide it and offer appropriate alternatives.

7. **Encourage Independent Thinking**: Regularly prompt students to apply their own reasoning and knowledge.

## Response Framework:

When a student asks a question:
- First, assess whether answering would compromise academic integrity
- If borderline, err on the side of guidance over direct answers
- Break complex topics into digestible pieces
- Ask clarifying questions to understand what the student already knows
- Encourage the student to attempt solutions and bring their thinking to you

---

## Course-Specific Restrictions and Guidelines:

"""


class PromptBuilderService:
    """Service for building assignment-specific system prompts."""
    
    def __init__(self, db: DatabaseService, api_key_file: str = "api_key.txt"):
        """
        Initialize the prompt builder service.
        
        Args:
            db: Database service instance
            api_key_file: Path to Claude API key file
        """
        self.db = db
        self.llm = ClaudeClient(api_key_file)
    
    def build_prompt(self, assignment_id: str, professor_instructions: str,
                    metadata: Dict = None, assignment_text: str = None) -> Dict:
        """
        Build a complete system prompt from professor instructions.
        
        Args:
            assignment_id: Assignment identifier
            professor_instructions: Natural language instructions from professor
            metadata: Optional metadata (course, professor, exam content, etc.)
            
        Returns:
            Dictionary with final_prompt, validation, and restrictions
        """
        # Step 1: Translate instructions into structured restrictions
        restrictions = self._translate_instructions(professor_instructions+"\n\nASSIGNMENNT:\n"+assignment_text)
        
        # Step 2: Validate the restrictions
        validation = self._validate_restrictions(restrictions)
        
        # Step 3: Combine base + restrictions
        final_prompt = BASE_SYSTEM_PROMPT + restrictions + "\n\nASSIGNMENT:\n"+assignment_text
        
        # Step 4: Save to database
        self.db.save_prompt(assignment_id, final_prompt, metadata)
        
        return {
            'final_prompt': final_prompt,
            'restrictions': restrictions,
            'validation': validation
        }
    
    def _translate_instructions(self, instructions: str) -> str:
        """Translate professor instructions into structured restrictions."""
        system = """You are an expert at translating professor instructions into clear, enforceable system prompt restrictions for AI assistants.

Your task is to take the professor's natural language instructions and convert them into:
1. Specific, actionable restrictions on what the AI should NOT do
2. Clear guidelines on what help IS appropriate
3. Any subject-specific context or requirements

Format your output as clear bullet points under these sections:
- PROHIBITED ASSISTANCE:
- PERMITTED ASSISTANCE:
- SUBJECT-SPECIFIC CONTEXT:

Be specific and anticipate edge cases. Think about how students might try to get around restrictions."""

        prompt = f"""Professor's Instructions:
{instructions}

Convert these instructions into clear, specific system prompt restrictions and guidelines. Be thorough and anticipate how students might phrase questions to work around restrictions."""

        return self.llm.generate(
            prompt=prompt,
            system_prompt=system,
            max_tokens=2048
        )
    
    def _validate_restrictions(self, restrictions: str) -> str:
        """Validate that restrictions are clear and complete."""
        system = """You are a quality assurance expert for educational AI systems. Your job is to identify potential loopholes, ambiguities, or issues in system prompt restrictions.

Review the restrictions and provide:
1. Any loopholes or edge cases that aren't covered
2. Ambiguous phrasing that could be misinterpreted
3. Suggested improvements or additions

If the restrictions are solid, say "VALIDATED" and explain why they're effective."""

        prompt = f"""Review these system prompt restrictions:

{restrictions}

Identify any issues, loopholes, or improvements needed. Consider how a motivated student might try to circumvent these restrictions."""

        return self.llm.generate(
            prompt=prompt,
            system_prompt=system,
            max_tokens=2048
        )