#!/usr/bin/env python3
"""
Script to parse QAssure-API-UseCases.md, run tests, and update with actual results
"""

import requests
import json
import re
from datetime import datetime
from typing import Dict, List, Optional, Tuple

BASE_URL = "http://localhost:3000/api/v1"
TEST_EMAIL = "testuser2@example.com"
TEST_PASSWORD = "Test123456"

def parse_markdown_table(content: str) -> List[Dict]:
    """Parse markdown table rows into structured data"""
    lines = content.split('\n')
    test_cases = []
    
    for line in lines[4:]:  # Skip header rows
        if '|' not in line or line.strip().startswith('|--'):
            continue
        
        parts = [p.strip() for p in line.split('|') if p.strip()]
        if len(parts) >= 6:
            test_cases.append({
                'category': parts[0],
                'endpoint': parts[1],
                'method': parts[2],
                'description': parts[3],
                'input': parts[4],
                'expected': parts[5],
                'criteria': parts[6] if len(parts) > 6 else ''
            })
    
    return test_cases

def make_api_request(method: str, endpoint: str, token: Optional[str] = None,
                    body: Optional[Dict] = None, params: Optional[Dict] = None) -> Tuple[int, Dict]:
    """Make API request and return status and response"""
    url = f"{BASE_URL}{endpoint}"
    headers = {"Content-Type": "application/json"}
    
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    try:
        if method.upper() == "GET":
            resp = requests.get(url, headers=headers, params=params, timeout=10)
        elif method.upper() == "POST":
            resp = requests.post(url, json=body, headers=headers, timeout=10)
        elif method.upper() == "PUT":
            resp = requests.put(url, json=body, headers=headers, timeout=10)
        elif method.upper() == "DELETE":
            resp = requests.delete(url, headers=headers, timeout=10)
        else:
            return 405, {"error": "Method not allowed"}
        
        try:
            return resp.status_code, resp.json()
        except:
            return resp.status_code, {"raw": resp.text}
    except Exception as e:
        return 0, {"error": str(e)}

def determine_pass_fail(actual_status: int, expected_desc: str, criteria: str) -> str:
    """Determine if test passed based on actual vs expected"""
    # Extract expected status codes from expected description
    expected_codes = []
    if "200" in expected_desc or "OK" in expected_desc:
        expected_codes.append(200)
    if "201" in expected_desc or "Created" in expected_desc:
        expected_codes.append(201)
    if "400" in expected_desc or "Bad Request" in expected_desc:
        expected_codes.append(400)
    if "401" in expected_desc or "Unauthorized" in expected_desc:
        expected_codes.append(401)
    if "403" in expected_desc or "Forbidden" in expected_desc:
        expected_codes.append(403)
    if "404" in expected_desc or "Not Found" in expected_desc:
        expected_codes.append(404)
    if "409" in expected_desc or "Conflict" in expected_desc:
        expected_codes.append(409)
    
    if expected_codes and actual_status in expected_codes:
        return "PASS"
    elif not expected_codes and 200 <= actual_status < 300:
        return "PASS"
    else:
        return "FAIL"

def update_markdown_with_results(input_file: str, output_file: str, token: str):
    """Read markdown, test scenarios, and write updated version"""
    
    with open(input_file, 'r') as f:
        content = f.read()
    
    lines = content.split('\n')
    updated_lines = []
    i = 0
    
    while i < len(lines):
        line = lines[i]
        
        # Check if this is a table row with test case
        if '|' in line and not line.strip().startswith('|--') and i > 3:
            parts = [p.strip() for p in line.split('|') if p.strip()]
            
            if len(parts) >= 6:
                endpoint = parts[1]
                method = parts[2]
                description = parts[3]
                
                # Extract input parameters
                input_params = parts[4] if len(parts) > 4 else ""
                
                # Parse and make request
                body = None
                params = None
                use_token = True
                
                # Simple parsing - in production, would need more sophisticated parsing
                if 'Body:' in input_params:
                    body_str = input_params.split('Body:')[1].strip()
                    try:
                        body = json.loads(body_str)
                        use_token = False if 'valid@example.com' in body_str and 'password' not in body_str else True
                    except:
                        pass
                
                if 'Query:' in input_params:
                    query_str = input_params.split('Query:')[1].strip()
                    # Simple query parsing
                    params = {}
                    if 'page=' in query_str:
                        params['page'] = query_str.split('page=')[1].split()[0]
                    if 'limit=' in query_str:
                        params['limit'] = query_str.split('limit=')[1].split()[0]
                
                # Handle special cases
                if 'No token' in input_params or 'No/invalid token' in input_params:
                    use_token = False
                    token_to_use = None
                else:
                    token_to_use = token if use_token else None
                
                # Make request
                actual_status, actual_response = make_api_request(
                    method, endpoint, token_to_use, body, params
                )
                
                # Format actual response (truncate if too long)
                actual_response_str = json.dumps(actual_response, indent=2)
                if len(actual_response_str) > 200:
                    actual_response_str = actual_response_str[:200] + "..."
                
                # Determine pass/fail
                pass_fail = determine_pass_fail(actual_status, parts[5], parts[6] if len(parts) > 6 else "")
                
                # Reconstruct line with new columns
                # Original: Category | Endpoint | Method | Description | Input | Expected | Criteria
                # Updated:  Category | Endpoint | Method | Description | Input | Expected | Actual Response | Actual Status | Pass/Fail | Criteria
                
                if len(parts) == 7:
                    # Already has all columns
                    updated_line = f"| {parts[0]} | {parts[1]} | {parts[2]} | {parts[3]} | {parts[4]} | {parts[5]} | {actual_response_str[:100]}... | {actual_status} | {pass_fail} | {parts[6]} |"
                else:
                    # Need to add columns
                    updated_line = f"| {parts[0]} | {parts[1]} | {parts[2]} | {parts[3]} | {parts[4]} | {parts[5]} | {actual_response_str[:100]}... | {actual_status} | {pass_fail} | {parts[6] if len(parts) > 6 else ''} |"
                
                updated_lines.append(updated_line)
                i += 1
                continue
        
        updated_lines.append(line)
        i += 1
    
    # Write updated content
    with open(output_file, 'w') as f:
        f.write('\n'.join(updated_lines))
    
    print(f"Updated markdown written to: {output_file}")

if __name__ == "__main__":
    # Login first
    print("Logging in...")
    login_resp = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    
    if login_resp.status_code == 200:
        token = login_resp.json()["data"]["access_token"]
        print("Login successful!")
        
        # Update markdown
        input_file = "dev/readme-file/QAssure-API-UseCases.md"
        output_file = "dev/readme-file/QAssure-API-UseCases-Updated.md"
        
        update_markdown_with_results(input_file, output_file, token)
    else:
        print("Login failed!")
        sys.exit(1)
