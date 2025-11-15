"""
Diagnostics Service
==================
Analyzes student chat histories to identify learning gaps and patterns.
"""

import json
from typing import Dict, List
from src.llm_client import ClaudeClient
from src.database import DatabaseService


class DiagnosticsService:
    """Service for analyzing student chat histories."""
    
    def __init__(self, db: DatabaseService, api_key_file: str = "api_key.txt"):
        """
        Initialize the diagnostics service.
        
        Args:
            db: Database service instance
            api_key_file: Path to Claude API key file
        """
        self.db = db
        self.llm = ClaudeClient(api_key_file)
        
        # Cache for analyzed data
        self.analysis_cache = {}
    
    def analyze_assignment(self, assignment_id: str) -> Dict:
        """
        Analyze all student chat histories for an assignment.
        
        Args:
            assignment_id: Assignment identifier
            
        Returns:
            Complete analysis with statistics and insights
        """
        # Load conversations
        conversations, exam_content = self.db.get_conversations_for_diagnostics(
            assignment_id
        )
        
        if not conversations:
            return {
                'assignment_id': assignment_id,
                'error': 'No chat histories found'
            }
        
        # Analyze first student to establish categories
        first_analysis = self._analyze_first_student(
            conversations[0], 
            exam_content
        )
        
        canonical_categories = self._extract_categories(first_analysis)
        student_analyses = [first_analysis]
        
        # Analyze remaining students
        for i, conv in enumerate(conversations[1:], start=2):
            analysis = self._analyze_student(
                conv, 
                exam_content, 
                canonical_categories,
                student_num=i
            )
            student_analyses.append(analysis)
        
        # Generate statistics
        statistics = self._generate_statistics(student_analyses)
        
        # Create overview report
        overview = self._create_overview(student_analyses, statistics)
        
        # Cache the analysis
        self.analysis_cache[assignment_id] = {
            'assignment_id': assignment_id,
            'student_analyses': student_analyses,
            'statistics': statistics,
            'canonical_categories': canonical_categories,
            'exam_content': exam_content
        }
        
        return {
            'assignment_id': assignment_id,
            'total_students': len(conversations),
            'overview': overview,
            'statistics': statistics,
            'student_analyses': student_analyses
        }
    
    def query(self, assignment_id: str, question: str) -> str:
        """
        Answer a professor's question about student performance.
        
        Args:
            assignment_id: Assignment identifier
            question: Professor's question
            
        Returns:
            Answer based on analyzed data
        """
        if assignment_id not in self.analysis_cache:
            # Try to load from previous analysis
            # For now, return error
            return "Please run analysis first before querying."
        
        analysis_data = self.analysis_cache[assignment_id]
        
        system = """You are an educational data analyst. Answer the professor's question based on the student performance data provided."""
        
        prompt = f"""Analysis Data:
{json.dumps(analysis_data, indent=2)}

Professor's Question: {question}

Provide a clear, data-driven answer to the professor's question."""
        
        return self.llm.generate(
            prompt=prompt,
            system_prompt=system,
            max_tokens=2048
        )
    
    def _analyze_first_student(self, conversation: List[str], 
                              exam_content: str) -> Dict:
        """Analyze first student to establish canonical categories."""
        system = """You are an expert educational diagnostician. Analyze a student's chat conversation to identify:
1. Topics/concepts the student UNDERSTOOD well
2. Topics/concepts the student STRUGGLED with
3. Topics/concepts the student ASKED ABOUT

Create SPECIFIC, CANONICAL labels that can be reused for other students."""
        
        conv_text = self._format_conversation(conversation)
        
        prompt = f"""Exam Content:
{exam_content}

Student Conversation:
{conv_text}

Analyze and output a JSON object:
{{
  "student_id": "student_1",
  "understood_well": [
    {{"category": "specific topic", "evidence": "quote or summary"}}
  ],
  "struggled_with": [
    {{"category": "specific topic", "evidence": "quote", "severity": "low|medium|high"}}
  ],
  "asked_about": [
    {{"category": "specific topic", "resolution": "resolved|unresolved"}}
  ],
  "total_questions": number,
  "engagement_level": "low|medium|high"
}}

Output ONLY valid JSON."""
        
        response = self.llm.generate(prompt=prompt, system_prompt=system)
        
        # Clean and parse JSON
        response = response.replace('```json', '').replace('```', '').strip()
        return json.loads(response)
    
    def _analyze_student(self, conversation: List[str], exam_content: str,
                        canonical_categories: List[Dict], 
                        student_num: int) -> Dict:
        """Analyze a student using canonical categories."""
        system = f"""You are an expert educational diagnostician. Map this student's understanding to EXISTING CANONICAL CATEGORIES.

CANONICAL CATEGORIES:
{json.dumps([c['category'] for c in canonical_categories], indent=2)}

Use EXACT category names when applicable. Only create NEW categories if genuinely different."""
        
        conv_text = self._format_conversation(conversation)
        
        prompt = f"""Exam Content:
{exam_content}

Student Conversation:
{conv_text}

Analyze and output a JSON object (same format as before) for student_{student_num}.
Use canonical categories where applicable. Output ONLY valid JSON."""
        
        response = self.llm.generate(prompt=prompt, system_prompt=system)
        response = response.replace('```json', '').replace('```', '').strip()
        return json.loads(response)
    
    def _extract_categories(self, first_analysis: Dict) -> List[Dict]:
        """Extract canonical categories from first analysis."""
        categories = []
        
        for item in first_analysis.get('understood_well', []):
            categories.append({
                'category': item['category'],
                'type': 'understood'
            })
        
        for item in first_analysis.get('struggled_with', []):
            categories.append({
                'category': item['category'],
                'type': 'struggled'
            })
        
        return categories
    
    def _generate_statistics(self, analyses: List[Dict]) -> str:
        """Generate statistics string formatted as Markdown."""
        total_students = len(analyses)
        if total_students == 0:
            return "No student data available for statistics."
        
        # Count struggles
        struggle_counts = {}
        for analysis in analyses:
            for item in analysis.get('struggled_with', []):
                category = item['category']
                struggle_counts[category] = struggle_counts.get(category, 0) + 1
        
        # Count understanding
        understood_counts = {}
        for analysis in analyses:
            for item in analysis.get('understood_well', []):
                category = item['category']
                understood_counts[category] = understood_counts.get(category, 0) + 1

        # Build the Markdown string
        lines = []
        lines.append(f"### 📊 Class Statistics (N={total_students})")
        lines.append("")  # Empty line for spacing

        # Format Top Struggles
        lines.append("#### ⚠️ Top Struggles")
        sorted_struggles = sorted(struggle_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        
        if not sorted_struggles:
            lines.append("_No significant struggles detected._")
        else:
            for topic, count in sorted_struggles:
                pct = (count / total_students) * 100
                lines.append(f"- **{topic}**: {count} students ({pct:.1f}%)")
        
        lines.append("")  # Empty line for spacing

        # Format Top Understood
        lines.append("#### ✅ Well Understood")
        sorted_understood = sorted(understood_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        
        if not sorted_understood:
            lines.append("_No clear patterns of understanding detected._")
        else:
            for topic, count in sorted_understood:
                pct = (count / total_students) * 100
                lines.append(f"- **{topic}**: {count} students ({pct:.1f}%)")

        return "\n".join(lines)
    
    def _create_overview(self, analyses: List[Dict], stats: Dict) -> str:
        """Create overview report."""
        system = """You are an educational analyst. Create a concise overview report for the professor."""
        
        prompt = f"""Student Analyses:
{json.dumps(analyses, indent=2)}

Statistics:
{json.dumps(stats, indent=2)}

Create a brief overview report highlighting:
1. Overall performance patterns
2. Common struggles
3. Well-understood concepts
4. Recommendations for the professor

Keep it concise and actionable."""
        
        return self.llm.generate(prompt=prompt, system_prompt=system)
    
    def _format_conversation(self, messages: List[str]) -> str:
        """Format conversation messages for analysis."""
        formatted = ""
        for i, msg in enumerate(messages):
            role = "Student" if i % 2 == 0 else "Assistant"
            formatted += f"{role}: {msg}\n"
        return formatted