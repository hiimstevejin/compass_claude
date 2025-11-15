#%%
"""
Test Script for Quiz Endpoint
==============================
Tests the /api/quiz/process-prompt endpoint that your frontend will use.
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


def test_health():
    """Test health check."""
    print_section("1. Health Check")
    
    response = requests.get(f"{BASE_URL}/api/health")
    print(f"Status: {response.status_code}")
    data = response.json()
    print(f"Service: {data['service']}")
    print(f"Active Sessions: {data['active_sessions']}")
    print(f"Status: {data['status']}")
    
    return response.status_code == 200


def test_first_quiz_question():
    """Test first question - should create new session."""
    print_section("2. First Quiz Question (Creates New Session)")
    
    request_data = {
        "prompt": "What is Big O notation?",
        "questionId": "question-1",
        "questionText": "What is the time complexity of binary search in a sorted array?",
        "studentId": "test_student_001",
        "assignmentId": "algorithms_quiz",
        "settings": {}
    }
    
    print("Request:")
    print(json.dumps(request_data, indent=2))
    
    response = requests.post(
        f"{BASE_URL}/api/quiz/process-prompt",
        json=request_data
    )
    
    print(f"\nStatus: {response.status_code}")
    data = response.json()
    print(f"Session ID: {data['sessionId']}")
    print(f"Question ID: {data['questionId']}")
    print(f"\nAI Response:")
    print(data['response'])
    
    return response.status_code == 200


def test_followup_question():
    """Test follow-up question - should use existing session."""
    print_section("3. Follow-up Question (Uses Existing Session)")
    
    request_data = {
        "prompt": "Can you give me a hint?",
        "questionId": "question-1",
        "questionText": "What is the time complexity of binary search in a sorted array?",
        "studentId": "test_student_001",
        "assignmentId": "algorithms_quiz",
        "settings": {}
    }
    
    print("Request:")
    print(json.dumps(request_data, indent=2))
    
    response = requests.post(
        f"{BASE_URL}/api/quiz/process-prompt",
        json=request_data
    )
    
    print(f"\nStatus: {response.status_code}")
    data = response.json()
    print(f"Session ID: {data['sessionId']}")
    print(f"\nAI Response:")
    print(data['response'])
    
    return response.status_code == 200


def test_new_question_same_session():
    """Test new question in same session - should maintain context."""
    print_section("4. New Question (Same Session)")
    
    time.sleep(1)  # Small delay
    
    request_data = {
        "prompt": "What about merge sort?",
        "questionId": "question-2",
        "questionText": "What is the time complexity of merge sort?",
        "studentId": "test_student_001",
        "assignmentId": "algorithms_quiz",
        "settings": {}
    }
    
    print("Request:")
    print(json.dumps(request_data, indent=2))
    
    response = requests.post(
        f"{BASE_URL}/api/quiz/process-prompt",
        json=request_data
    )
    
    print(f"\nStatus: {response.status_code}")
    data = response.json()
    print(f"Session ID: {data['sessionId']}")
    print(f"\nAI Response:")
    print(data['response'])
    
    return response.status_code == 200


def test_session_info():
    """Test getting session information."""
    print_section("5. Get Session Info")
    
    request_data = {
        "studentId": "test_student_001",
        "assignmentId": "algorithms_quiz"
    }
    
    response = requests.post(
        f"{BASE_URL}/api/quiz/session-info",
        json=request_data
    )
    
    print(f"Status: {response.status_code}")
    data = response.json()
    print(f"Response:")
    print(json.dumps(data, indent=2))
    
    return response.status_code == 200


def test_different_student():
    """Test with a different student - should create separate session."""
    print_section("6. Different Student (New Session)")
    
    request_data = {
        "prompt": "I need help with recursion",
        "questionId": "question-1",
        "questionText": "What is the time complexity of binary search?",
        "studentId": "test_student_002",
        "assignmentId": "algorithms_quiz",
        "settings": {}
    }
    
    response = requests.post(
        f"{BASE_URL}/api/quiz/process-prompt",
        json=request_data
    )
    
    print(f"Status: {response.status_code}")
    data = response.json()
    print(f"Session ID: {data['sessionId']}")
    print(f"\nAI Response:")
    print(data['response'][:200] + "...")
    
    return response.status_code == 200


def test_clear_session():
    """Test clearing a session."""
    print_section("7. Clear Session")
    
    request_data = {
        "studentId": "test_student_001",
        "assignmentId": "algorithms_quiz"
    }
    
    response = requests.post(
        f"{BASE_URL}/api/quiz/clear-session",
        json=request_data
    )
    
    print(f"Status: {response.status_code}")
    data = response.json()
    print(f"Response:")
    print(json.dumps(data, indent=2))
    
    return response.status_code == 200


def test_health_after_tests():
    """Check health and active sessions after tests."""
    print_section("8. Final Health Check")
    
    response = requests.get(f"{BASE_URL}/api/health")
    data = response.json()
    print(f"Active Sessions: {data['active_sessions']}")
    print(f"Status: {data['status']}")
    
    return response.status_code == 200


def main():
    """Run all tests."""
    print("\n" + "="*80)
    print("COMPASS QUIZ ENDPOINT TEST SUITE")
    print("="*80)
    print("\nMake sure the API server is running on http://localhost:5000")
    print("Start it with: python api_server.py")
    
    input("\nPress Enter to continue...")
    
    results = {
        "Health Check": test_health(),
        "First Quiz Question": test_first_quiz_question(),
        "Follow-up Question": test_followup_question(),
        "New Question Same Session": test_new_question_same_session(),
        "Session Info": test_session_info(),
        "Different Student": test_different_student(),
        "Clear Session": test_clear_session(),
        "Final Health Check": test_health_after_tests()
    }
    
    print("\n" + "="*80)
    print("TEST RESULTS")
    print("="*80)
    
    for test_name, passed in results.items():
        status = "✓ PASSED" if passed else "✗ FAILED"
        print(f"{test_name:.<50} {status}")
    
    all_passed = all(results.values())
    
    print("\n" + "="*80)
    if all_passed:
        print("ALL TESTS PASSED! ✓")
        print("\nYour frontend can now use:")
        print("  POST http://localhost:5000/api/quiz/process-prompt")
    else:
        print("SOME TESTS FAILED! ✗")
    print("="*80 + "\n")


if __name__ == "__main__":
    main()