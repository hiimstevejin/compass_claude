#%%
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

def test_analyze():
    """Test first question - should create new session."""
    print_section("2. First Quiz Question (Creates New Session)")
    
    request_data = {
        "assignment_id": "algorithms_quiz"
    }
    
    print("Request:")
    print(json.dumps(request_data, indent=2))
    
    response = requests.post(
        f"{BASE_URL}/api/diagnostics/analyze",
        json=request_data
    )
    
    print(f"\nStatus: {response.status_code}")
    data = response.json()
    print(f"Session ID: {data['overview']}")
    print(f"Question ID: {data['statistics']}")
    
    return response.status_code == 200

def test_chat():
    """Test first question - should create new session."""
    print_section("2. First Quiz Question (Creates New Session)")
    
    request_data = {
        "assignment_id": "algorithms_quiz",
        "question": "Which topic did students struggle with most?"
    }
    
    print("Request:")
    print(json.dumps(request_data, indent=2))
    
    response = requests.post(
        f"{BASE_URL}/api/diagnostics/query",
        json=request_data
    )
    
    print(f"\nStatus: {response.status_code}")
    data = response.json()
    print(f"Question: {data['question']}")
    print(f"Answer: {data['answer']}")
    
    return response.status_code == 200


def main():
    test_health()
    test_analyze()
    test_chat()

if __name__ == "__main__":
    main()