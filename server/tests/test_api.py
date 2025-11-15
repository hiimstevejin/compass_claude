#%%
"""
Test Script for Compass API
============================
Simple script to test the API endpoints.
"""

import requests
import json

BASE_URL = "http://localhost:5000"

def test_health():
    """Test health check endpoint."""
    print("\n" + "="*80)
    print("Testing Health Check")
    print("="*80)
    
    response = requests.get(f"{BASE_URL}/api/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    return response.status_code == 200


def test_create_prompt():
    """Test creating an assignment prompt."""
    print("\n" + "="*80)
    print("Testing Prompt Creation")
    print("="*80)
    
    data = {
        "assignment_id": "test_bio_midterm",
        "professor_instructions": """
        This is a cell biology midterm. Students can ask about concepts,
        but they should NOT get direct answers to test questions.
        
        Specifically:
        - Do not explain prokaryotic vs eukaryotic cells (question 1)
        - Do not list the stages of mitosis (question 4)
        
        Students CAN get help with:
        - Understanding terminology
        - Clarifying what questions are asking
        - General study strategies
        """,
        "metadata": {
            "course": "BIO 201",
            "professor": "Dr. Smith",
            "exam_content": "1. Explain prokaryotic vs eukaryotic\n2. What is mitosis?"
        }
    }
    
    response = requests.post(f"{BASE_URL}/api/prompts", json=data)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    return response.status_code == 201


def test_chat():
    """Test student chat."""
    print("\n" + "="*80)
    print("Testing Student Chat")
    print("="*80)
    
    data = {
        "student_id": "test_student_001",
        "assignment_id": "test_bio_midterm",
        "message": "What does organelle mean?"
    }
    
    response = requests.post(f"{BASE_URL}/api/chat", json=data)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    return response.status_code == 200


def test_list_assignments():
    """Test listing assignments."""
    print("\n" + "="*80)
    print("Testing List Assignments")
    print("="*80)
    
    response = requests.get(f"{BASE_URL}/api/assignments")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    return response.status_code == 200


def main():
    """Run all tests."""
    print("\n" + "="*80)
    print("COMPASS API TEST SUITE")
    print("="*80)
    print("\nMake sure the API server is running on http://localhost:5000")
    print("Start it with: python api_server.py")
    
    input("\nPress Enter to continue...")
    
    results = {
        "Health Check": test_health(),
        "Create Prompt": test_create_prompt(),
        "Student Chat": test_chat(),
        "List Assignments": test_list_assignments()
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
    else:
        print("SOME TESTS FAILED! ✗")
    print("="*80 + "\n")


if __name__ == "__main__":
    main()