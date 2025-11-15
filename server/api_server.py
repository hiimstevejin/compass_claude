"""
Quickstart:
Run: python api_server.py

Compass API Server
==================
HTTP API for the Compass educational AI system.

Endpoints:
- POST /api/chat - Student chat interaction
- POST /api/prompts - Create/update assignment prompts
- GET /api/prompts/<assignment_id> - Get assignment prompt
- POST /api/diagnostics/analyze - Analyze student chat histories
- POST /api/diagnostics/query - Query diagnostic insights
- GET /api/assignments - List all assignments
- GET /api/students/<assignment_id> - List students for assignment
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime

# Import our refactored modules
from src.student_chat import StudentChatService
from src.prompt_builder import PromptBuilderService
from src.diagnostics import DiagnosticsService
from src.database import DatabaseService

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for frontend

# Initialize services
db_service = DatabaseService()
chat_service = StudentChatService(db_service)
prompt_service = PromptBuilderService(db_service)
diagnostics_service = DiagnosticsService(db_service)

# Session management: {session_key: chat_agent_instance}
# session_key = f"{student_id}_{assignment_id}"
active_chat_sessions = {}


# ============================================================================
# STUDENT CHAT ENDPOINTS
# ============================================================================

@app.route('/api/quiz/process-prompt', methods=['POST'])
def process_quiz_prompt():
    """
    Handle quiz prompt from frontend.
    
    Request body:
    {
        "prompt": "What the student typed",
        "questionId": "question-1",
        "questionText": "What is the time complexity...",
        "settings": {},
        "studentId": "student123",  # optional, generated if not provided
        "assignmentId": "quiz_1"     # optional, uses default if not provided
    }
    
    Response:
    {
        "response": "AI response text",
        "questionId": "question-1",
        "sessionId": "student123_quiz_1",
        "timestamp": "2024-11-15T14:30:22.123456"
    }
    """
    try:
        data = request.get_json()
        
        # Validate required fields
        if 'prompt' not in data:
            return jsonify({
                'error': 'Missing required field: prompt'
            }), 400
        
        prompt = data['prompt']
        question_id = data.get('questionId', 'unknown')
        question_text = data.get('questionText', '')
        student_id = data.get('studentId', 'anonymous_student')
        assignment_id = data.get('assignmentId', 'default_quiz')
        
        # Create session key
        session_key = f"{student_id}_{assignment_id}"
        
        # Get or create chat agent for this session
        if session_key not in active_chat_sessions:
            # First request - create new chat agent
            from src.student_chat import ChatAgent
            
            # Load or use default prompt
            try:
                prompt_data = db_service.load_prompt(assignment_id)
                system_prompt = prompt_data['system_prompt']
            except:
                # Use default educational prompt if assignment not found
                from src.prompt_builder import BASE_SYSTEM_PROMPT
                system_prompt = BASE_SYSTEM_PROMPT + """
## QUIZ-SPECIFIC GUIDELINES:

- Help students understand concepts, but don't solve quiz questions directly
- Encourage critical thinking and problem-solving
- Provide hints and guidance, not complete answers
- Reference the specific question context when helpful
"""
            
            # Create new chat agent
            agent = ChatAgent(
                student_id=student_id,
                assignment_id=assignment_id,
                system_prompt=system_prompt,
                db_service=db_service
            )
            active_chat_sessions[session_key] = agent
        else:
            # Use existing chat agent
            agent = active_chat_sessions[session_key]
        
        # Build context-aware prompt with question info
        context_prompt = prompt
        if question_text:
            context_prompt = f"[Question: {question_text}]\n\nStudent asks: {prompt}"
        
        # Get response from agent
        response = agent.send_message(context_prompt)
        
        # Agent automatically saves after each message
        
        return jsonify({
            'response': response,
            'questionId': question_id,
            'sessionId': session_key,
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        import traceback
        print(f"Error in process_quiz_prompt: {e}")
        print(traceback.format_exc())
        return jsonify({
            'error': str(e),
            'details': 'Internal server error processing quiz prompt'
        }), 500


@app.route('/api/chat', methods=['POST'])
def chat():
    """
    Handle student chat messages.
    
    Request body:
    {
        "student_id": "student123",
        "assignment_id": "bio_midterm_1",
        "message": "What does prokaryotic mean?"
    }
    
    Response:
    {
        "response": "AI response text",
        "session_id": "bio_midterm_1_student123",
        "timestamp": "2024-11-15T14:30:22.123456"
    }
    """
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['student_id', 'assignment_id', 'message']
        if not all(field in data for field in required_fields):
            return jsonify({
                'error': 'Missing required fields',
                'required': required_fields
            }), 400
        
        student_id = data['student_id']
        assignment_id = data['assignment_id']
        message = data['message']
        
        # Get or create chat session
        response, session_id = chat_service.send_message(
            student_id=student_id,
            assignment_id=assignment_id,
            message=message
        )
        
        return jsonify({
            'response': response,
            'session_id': session_id,
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        return jsonify({
            'error': str(e)
        }), 500


@app.route('/api/chat/history/<student_id>/<assignment_id>', methods=['GET'])
def get_chat_history(student_id, assignment_id):
    """
    Get chat history for a student on a specific assignment.
    
    Response:
    {
        "student_id": "student123",
        "assignment_id": "bio_midterm_1",
        "conversation": [...],
        "total_messages": 10
    }
    """
    try:
        history = chat_service.get_history(student_id, assignment_id)
        return jsonify(history), 200
    except FileNotFoundError:
        return jsonify({
            'error': 'Chat history not found'
        }), 404
    except Exception as e:
        return jsonify({
            'error': str(e)
        }), 500


# ============================================================================
# PROMPT MANAGEMENT ENDPOINTS
# ============================================================================

@app.route('/api/prompts', methods=['POST'])
def create_prompt():
    """
    Create a new assignment prompt from professor instructions.
    
    Request body:
    {
        "assignment_id": "bio_midterm_1",
        "professor_instructions": "Students can ask about concepts but not...",
        "metadata": {
            "course": "BIO 201",
            "professor": "Dr. Smith",
            "exam_content": "1. Question 1..."
        }
    }
    
    Response:
    {
        "assignment_id": "bio_midterm_1",
        "status": "created",
        "prompt_preview": "First 200 chars..."
    }
    """
    try:
        data = request.get_json()
        
        required_fields = ['assignment_id', 'professor_instructions']
        if not all(field in data for field in required_fields):
            return jsonify({
                'error': 'Missing required fields',
                'required': required_fields
            }), 400
        
        assignment_id = data['assignment_id']
        instructions = data['professor_instructions']
        metadata = data.get('metadata', {})
        assignment_text = metadata.get('exam_content', '')
        
        # Build the prompt
        result = prompt_service.build_prompt(
            assignment_text=assignment_text,
            assignment_id=assignment_id,
            professor_instructions=instructions,
            metadata=metadata
        )
        
        return jsonify({
            'assignment_id': assignment_id,
            'status': 'created',
            'prompt_preview': result['final_prompt'][:200] + '...',
            'validation': result.get('validation', 'No validation available')
        }), 201
        
    except Exception as e:
        return jsonify({
            'error': str(e)
        }), 500


@app.route('/api/prompts/<assignment_id>', methods=['GET'])
def get_prompt(assignment_id):
    """
    Get the system prompt for an assignment.
    
    Response:
    {
        "assignment_id": "bio_midterm_1",
        "system_prompt": "You are an educational AI...",
        "metadata": {...}
    }
    """
    try:
        prompt_data = db_service.load_prompt(assignment_id)
        return jsonify(prompt_data), 200
    except FileNotFoundError:
        return jsonify({
            'error': f'Prompt not found for assignment: {assignment_id}'
        }), 404
    except Exception as e:
        return jsonify({
            'error': str(e)
        }), 500


# ============================================================================
# DIAGNOSTICS ENDPOINTS
# ============================================================================

@app.route('/api/diagnostics/analyze', methods=['POST'])
def analyze_assignment():
    """
    Analyze all student chat histories for an assignment.
    
    Request body:
    {
        "assignment_id": "bio_midterm_1"
    }
    
    Response:
    {
        "assignment_id": "bio_midterm_1",
        "total_students": 25,
        "overview": "Analysis report text...",
        "statistics": "Markdown report text..."
    }
    """
    try:
        data = request.get_json()
        
        if 'assignment_id' not in data:
            return jsonify({
                'error': 'Missing required field: assignment_id'
            }), 400
        
        assignment_id = data['assignment_id']
        
        # Run diagnostics
        results = diagnostics_service.analyze_assignment(assignment_id)
        
        return jsonify(results), 200
        
    except Exception as e:
        return jsonify({
            'error': str(e)
        }), 500


@app.route('/api/diagnostics/query', methods=['POST'])
def query_diagnostics():
    """
    Query diagnostic insights for an assignment.
    
    Request body:
    {
        "assignment_id": "bio_midterm_1",
        "question": "Which topic did students struggle with most?"
    }
    
    Response:
    {
        "question": "Which topic...",
        "answer": "Students struggled most with..."
    }
    """
    try:
        data = request.get_json()
        
        required_fields = ['assignment_id', 'question']
        if not all(field in data for field in required_fields):
            return jsonify({
                'error': 'Missing required fields',
                'required': required_fields
            }), 400
        
        assignment_id = data['assignment_id']
        question = data['question']
        
        answer = diagnostics_service.query(assignment_id, question)
        
        return jsonify({
            'question': question,
            'answer': answer
        }), 200
        
    except Exception as e:
        return jsonify({
            'error': str(e)
        }), 500


# ============================================================================
# GENERAL ENDPOINTS
# ============================================================================


@app.route('/api/health', methods=['GET'])
def health_check():
    """Simple health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'service': 'Compass API',
        'active_sessions': len(active_chat_sessions),
        'timestamp': datetime.now().isoformat()
    }), 200



@app.route('/api/quiz/session-info', methods=['POST'])
def get_session_info():
    """
    Get information about a student's quiz session.
    
    Request body:
    {
        "studentId": "student123",
        "assignmentId": "quiz_1"
    }
    """
    try:
        data = request.get_json()
        student_id = data.get('studentId', 'anonymous_student')
        assignment_id = data.get('assignmentId', 'default_quiz')
        
        session_key = f"{student_id}_{assignment_id}"
        
        if session_key in active_chat_sessions:
            agent = active_chat_sessions[session_key]
            history = agent.get_history()
            
            return jsonify({
                'sessionId': session_key,
                'studentId': student_id,
                'assignmentId': assignment_id,
                'messageCount': len(history),
                'exists': True
            }), 200
        else:
            return jsonify({
                'sessionId': session_key,
                'exists': False
            }), 200
            
    except Exception as e:
        return jsonify({
            'error': str(e)
        }), 500


# ============================================================================
# ERROR HANDLERS
# ============================================================================

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'error': 'Endpoint not found'
    }), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'error': 'Internal server error'
    }), 500


# ============================================================================
# MAIN
# ============================================================================

if __name__ == '__main__':
    print("="*80)
    print("COMPASS API SERVER")
    print("="*80)
    print("\nStarting server on http://localhost:5000")
    print("\nAvailable endpoints:")
    print("  🎯 QUIZ ENDPOINTS (for your frontend):")
    print("  POST   /api/quiz/process-prompt         # Main quiz endpoint")
    print("  POST   /api/quiz/clear-session          # Clear student session")
    print("  POST   /api/quiz/session-info           # Get session info")
    print("\n  💬 CHAT ENDPOINTS:")
    print("  POST   /api/chat")
    print("  GET    /api/chat/history/<student_id>/<assignment_id>")
    print("\n  📝 PROMPT MANAGEMENT:")
    print("  POST   /api/prompts")
    print("  GET    /api/prompts/<assignment_id>")
    print("\n  📊 DIAGNOSTICS:")
    print("  POST   /api/diagnostics/analyze")
    print("  POST   /api/diagnostics/query")
    print("\n  🔧 GENERAL:")
    print("  GET    /api/assignments")
    print("  GET    /api/students/<assignment_id>")
    print("  GET    /api/health")
    print("\n" + "="*80 + "\n")
    
    app.run(host='0.0.0.0', port=5000, debug=True)