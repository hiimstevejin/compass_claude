#%%
"""
Test Script for Prompt Creation Endpoint
=========================================
Tests the /api/prompts endpoint for creating assignment prompts.
"""

import requests
import json
import time

BASE_URL = "http://localhost:5000"


def print_section(title):
    """Print a formatted section header."""
    print("\n" + "="*80)
    print(title)
    print("="*80 + "\n")


def test_create_basic_prompt():
    """Test creating a basic assignment prompt."""
    print_section("1. Create Basic Assignment Prompt")
    
    request_data = {
        "assignment_id": "test_biology_quiz",
        "professor_instructions": """
        This is a cell biology quiz. Students can ask about concepts,
        but should NOT get direct answers to test questions.
        
        Prohibited:
        - Do not explain prokaryotic vs eukaryotic cells
        - Do not list the stages of mitosis
        
        Permitted:
        - Clarifying terminology
        - Study strategies
        - General concepts
        """,
        "metadata": {
            "course": "BIO 201",
            "professor": "Dr. Smith",
            "exam_content": "1. Explain prokaryotic vs eukaryotic cells\n2. List stages of mitosis"
        }
    }
    
    print("Request:")
    print(json.dumps(request_data, indent=2))
    
    response = requests.post(
        f"{BASE_URL}/api/prompts",
        json=request_data
    )
    
    print(f"\nStatus: {response.status_code}")
    
    if response.status_code == 201:
        data = response.json()
        print(f"Assignment ID: {data['assignment_id']}")
        print(f"Status: {data['status']}")
        print(f"\nPrompt Preview:")
        print(data['prompt_preview'])
        print(f"\nValidation:")
        print(data['validation'][:300] + "..." if len(data['validation']) > 300 else data['validation'])
        return True
    else:
        print(f"Error: {response.json()}")
        return False


def test_create_programming_prompt():
    """Test creating a programming assignment prompt."""
    print_section("2. Create Programming Assignment Prompt")
    
    request_data = {
        "assignment_id": "test_algorithms_homework",
        "professor_instructions": """
        Students are working on sorting algorithms. They can use AI for
        debugging and understanding concepts, but:
        
        - Do NOT write the complete sorting algorithm for them
        - Do NOT provide the full implementation code
        - Do NOT give them the exact answer to complexity questions
        
        They CAN:
        - Get help understanding algorithm logic
        - Debug specific errors in their code
        - Understand time complexity concepts
        - Learn about edge cases
        """,
        "metadata": {
            "course": "CS 301 - Algorithms",
            "professor": "Dr. Johnson",
            "exam_content": "Implement quicksort and analyze its time complexity"
        }
    }
    
    print("Request:")
    print(json.dumps(request_data, indent=2))
    
    response = requests.post(
        f"{BASE_URL}/api/prompts",
        json=request_data
    )
    
    print(f"\nStatus: {response.status_code}")
    
    if response.status_code == 201:
        data = response.json()
        print(f"Assignment ID: {data['assignment_id']}")
        print(f"Status: {data['status']}")
        print(f"\nPrompt Preview:")
        print(data['prompt_preview'])
        return True
    else:
        print(f"Error: {response.json()}")
        return False


def test_create_minimal_prompt():
    """Test creating a prompt with minimal metadata."""
    print_section("3. Create Minimal Prompt (No Metadata)")
    
    request_data = {
        "assignment_id": "test_minimal_quiz",
        "professor_instructions": "Students can ask for hints but not direct answers."
    }
    
    print("Request:")
    print(json.dumps(request_data, indent=2))
    
    response = requests.post(
        f"{BASE_URL}/api/prompts",
        json=request_data
    )
    
    print(f"\nStatus: {response.status_code}")
    
    if response.status_code == 201:
        data = response.json()
        print(f"Assignment ID: {data['assignment_id']}")
        print(f"Status: {data['status']}")
        return True
    else:
        print(f"Error: {response.json()}")
        return False


def test_missing_assignment_id():
    """Test error handling when assignment_id is missing."""
    print_section("4. Error Test - Missing Assignment ID")
    
    request_data = {
        "professor_instructions": "Some instructions here"
    }
    
    print("Request (missing assignment_id):")
    print(json.dumps(request_data, indent=2))
    
    response = requests.post(
        f"{BASE_URL}/api/prompts",
        json=request_data
    )
    
    print(f"\nStatus: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    return response.status_code == 400


def test_missing_instructions():
    """Test error handling when professor_instructions is missing."""
    print_section("5. Error Test - Missing Instructions")
    
    request_data = {
        "assignment_id": "test_no_instructions"
    }
    
    print("Request (missing professor_instructions):")
    print(json.dumps(request_data, indent=2))
    
    response = requests.post(
        f"{BASE_URL}/api/prompts",
        json=request_data
    )
    
    print(f"\nStatus: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    return response.status_code == 400


def test_get_created_prompt():
    """Test retrieving a prompt that was just created."""
    print_section("6. Get Created Prompt")
    
    assignment_id = "test_biology_quiz"
    
    print(f"Getting prompt for: {assignment_id}")
    
    response = requests.get(
        f"{BASE_URL}/api/prompts/{assignment_id}"
    )
    
    print(f"\nStatus: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"Assignment ID: {data['assignment_id']}")
        print(f"\nMetadata:")
        print(json.dumps(data['metadata'], indent=2))
        print(f"\nSystem Prompt Length: {len(data['system_prompt'])} characters")
        print(f"\nSystem Prompt Preview:")
        print(data['system_prompt'][:300] + "...")
        return True
    else:
        print(f"Error: {response.json()}")
        return False


def test_update_existing_prompt():
    """Test updating an existing prompt (overwrites)."""
    print_section("7. Update Existing Prompt")
    
    request_data = {
        "assignment_id": "test_biology_quiz",  # Same ID as test 1
        "professor_instructions": """
        UPDATED INSTRUCTIONS:
        This is still a cell biology quiz, but now with stricter rules.
        
        Students CANNOT:
        - Get any information about cell structures
        - Ask about any test topics
        
        Students CAN:
        - Ask how to study effectively
        - Request clarification on question wording only
        """,
        "metadata": {
            "course": "BIO 201 - Updated",
            "professor": "Dr. Smith",
            "exam_content": "Updated content",
            "version": "2.0"
        }
    }
    
    print("Request:")
    print(json.dumps(request_data, indent=2))
    
    response = requests.post(
        f"{BASE_URL}/api/prompts",
        json=request_data
    )
    
    print(f"\nStatus: {response.status_code}")
    
    if response.status_code == 201:
        data = response.json()
        print(f"Assignment ID: {data['assignment_id']}")
        print(f"Status: {data['status']}")
        print("\nPrompt has been updated (overwrites previous version)")
        return True
    else:
        print(f"Error: {response.json()}")
        return False


def test_list_all_assignments():
    """Test listing all created assignments."""
    print_section("8. List All Assignments")
    
    response = requests.get(f"{BASE_URL}/api/assignments")
    
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"\nTotal Assignments: {len(data['assignments'])}")
        print("\nAssignments:")
        for assignment in data['assignments']:
            print(f"\n  - {assignment['assignment_id']}")
            print(f"    Course: {assignment.get('course', 'N/A')}")
            print(f"    Professor: {assignment.get('professor', 'N/A')}")
            print(f"    Created: {assignment.get('created_at', 'N/A')}")
        return True
    else:
        print(f"Error: {response.json()}")
        return False


def test_use_prompt_with_quiz():
    """Test that the created prompt works with the quiz endpoint."""
    print_section("9. Test Prompt Works with Quiz Endpoint")
    
    print("Testing if created prompt works with quiz...")
    
    request_data = {
        "prompt": "What is a cell?",
        "questionId": "test-q1",
        "questionText": "Explain prokaryotic vs eukaryotic cells",
        "studentId": "test_student_prompt",
        "assignmentId": "test_biology_quiz"  # Uses prompt from test 1
    }
    
    response = requests.post(
        f"{BASE_URL}/api/quiz/process-prompt",
        json=request_data
    )
    
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"\nAI Response (using created prompt):")
        print(data['response'][:400] + "..." if len(data['response']) > 400 else data['response'])
        print(f"\n✓ Prompt successfully integrated with quiz endpoint!")
        return True
    else:
        print(f"Error: {response.json()}")
        return False


def test_complex_restrictions():
    """Test creating a prompt with complex, detailed restrictions."""
    print_section("10. Create Prompt with Complex Restrictions")
    
    request_data = {
        "assignment_id": "test_complex_math",
        "professor_instructions": """
        This is a calculus final exam. The restrictions are very specific:
        
        PROHIBITED - Students CANNOT receive help with:
        1. Integration techniques for questions 1-5
        2. Derivative calculations for questions 6-10
        3. The proof required in question 11
        4. Specific numerical answers to any problem
        5. Step-by-step solutions that they could copy
        
        PERMITTED - Students CAN receive help with:
        1. Understanding what a question is asking for
        2. Reviewing general calculus concepts NOT on this exam
        3. Clarifying mathematical notation
        4. Debugging their approach if they show their work first
        5. Confirming whether their reasoning is on the right track
        
        SPECIAL CASES:
        - If a student is completely stuck, give them a leading question
        - If they've made 3+ attempts, can provide a small hint
        - For the proof in question 11, can explain proof techniques but not the specific proof
        
        CONTEXT:
        This is a closed-book exam worth 40% of their grade. Academic integrity
        is critical. The exam covers integration, differentiation, limits, and
        one proof about continuity.
        """,
        "metadata": {
            "course": "MATH 251 - Calculus II",
            "professor": "Dr. Williams",
            "exam_content": """
            Final Exam - Calculus II
            1-5: Integration problems
            6-10: Derivative problems  
            11: Continuity proof
            12-15: Word problems
            """,
            "exam_date": "2024-12-15",
            "duration_minutes": 120,
            "total_points": 100
        }
    }
    
    print("Request (complex restrictions):")
    print(json.dumps(request_data, indent=2))
    
    response = requests.post(
        f"{BASE_URL}/api/prompts",
        json=request_data
    )
    
    print(f"\nStatus: {response.status_code}")
    
    if response.status_code == 201:
        data = response.json()
        print(f"Assignment ID: {data['assignment_id']}")
        print(f"\nValidation Result:")
        print(data['validation'][:500] + "..." if len(data['validation']) > 500 else data['validation'])
        return True
    else:
        print(f"Error: {response.json()}")
        return False


def main():
    """Run all tests."""
    print("\n" + "="*80)
    print("PROMPT CREATION ENDPOINT TEST SUITE")
    print("="*80)
    print("\nMake sure the API server is running on http://localhost:5000")
    print("Start it with: python api_server.py")
    
    input("\nPress Enter to continue...")
    
    # Run all tests
    results = {
        "Create Basic Prompt": test_create_basic_prompt(),
        "Create Programming Prompt": test_create_programming_prompt(),
        "Create Minimal Prompt": test_create_minimal_prompt(),
        "Missing Assignment ID (Error)": test_missing_assignment_id(),
        "Missing Instructions (Error)": test_missing_instructions(),
        "Get Created Prompt": test_get_created_prompt(),
        "Update Existing Prompt": test_update_existing_prompt(),
        "List All Assignments": test_list_all_assignments(),
        "Use Prompt with Quiz": test_use_prompt_with_quiz(),
        "Complex Restrictions": test_complex_restrictions()
    }
    
    # Print results
    print("\n" + "="*80)
    print("TEST RESULTS")
    print("="*80)
    
    for test_name, passed in results.items():
        status = "✓ PASSED" if passed else "✗ FAILED"
        print(f"{test_name:.<60} {status}")
    
    all_passed = all(results.values())
    
    print("\n" + "="*80)
    if all_passed:
        print("ALL TESTS PASSED! ✓")
        print("\nThe prompt creation system is working correctly!")
        print("\nYou can now:")
        print("  1. Create assignment prompts via API")
        print("  2. Students use those prompts automatically in quiz")
        print("  3. Update prompts as needed")
    else:
        print("SOME TESTS FAILED! ✗")
        print("Check the errors above and fix any issues.")
    print("="*80 + "\n")


if __name__ == "__main__":
    main()