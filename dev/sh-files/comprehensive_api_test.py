#!/usr/bin/env python3
"""
QAssure API Comprehensive Test Suite
Tests all endpoints from QAssure-API-UseCases.md and generates client-ready report
"""

import requests
import json
import time
from datetime import datetime
from typing import Dict, List, Optional, Tuple

BASE_URL = "http://localhost:3000/api/v1"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    END = '\033[0m'

class TestCase:
    def __init__(self, category: str, endpoint: str, method: str, description: str, 
                 input_params: str, expected_response: str, criteria: str):
        self.category = category
        self.endpoint = endpoint
        self.method = method
        self.description = description
        self.input_params = input_params
        self.expected_response = expected_response
        self.criteria = criteria
        self.actual_status: Optional[int] = None
        self.actual_response: str = ""
        self.pass_fail: str = "NOT_RUN"
        self.error: Optional[str] = None
        self.duration: float = 0.0

class APITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.access_token: Optional[str] = None
        self.refresh_token: Optional[str] = None
        self.user_id: Optional[str] = None
        self.tenant_id: Optional[str] = None
        self.test_cases: List[TestCase] = []
        self.created_resources = {
            'users': [],
            'tenants': [],
            'roles': [],
            'sessions': []
        }
        
    def make_request(self, method: str, endpoint: str, body: Optional[Dict] = None,
                    params: Optional[Dict] = None, headers: Optional[Dict] = None,
                    use_token: bool = True) -> Tuple[int, Dict]:
        """Make HTTP request"""
        url = f"{self.base_url}{endpoint}"
        req_headers = {"Content-Type": "application/json"}
        
        if use_token and self.access_token:
            req_headers["Authorization"] = f"Bearer {self.access_token}"
        
        if headers:
            req_headers.update(headers)
        
        try:
            start_time = time.time()
            if method.upper() == "GET":
                resp = requests.get(url, headers=req_headers, params=params, timeout=15)
            elif method.upper() == "POST":
                resp = requests.post(url, json=body, headers=req_headers, params=params, timeout=15)
            elif method.upper() == "PUT":
                resp = requests.put(url, json=body, headers=req_headers, timeout=15)
            elif method.upper() == "DELETE":
                resp = requests.delete(url, headers=req_headers, timeout=15)
            else:
                return 405, {"error": "Method not allowed"}
            
            duration = time.time() - start_time
            try:
                return resp.status_code, resp.json(), duration
            except:
                return resp.status_code, {"raw": resp.text[:500]}, duration
        except requests.exceptions.RequestException as e:
            return 0, {"error": str(e)}, 0.0
    
    def login(self, email: str, password: str) -> bool:
        """Login and get tokens"""
        status, response, _ = self.make_request("POST", "/auth/login", 
            {"email": email, "password": password}, use_token=False)
        if status == 200 and response.get("success"):
            data = response.get("data", {})
            self.access_token = data.get("access_token")
            self.refresh_token = data.get("refresh_token")
            self.user_id = data.get("user", {}).get("id")
            self.tenant_id = data.get("tenant_id")
            return True
        return False
    
    def find_test_user(self) -> Tuple[str, str]:
        """Try to find a valid test user"""
        # Try common test emails from seed script
        test_users = [
            ("polumuri.suresh@ltts.com", "Password123!"),
            ("admin@qassure.ai", "Password123!"),
            ("manager@qassure.ai", "Password123!"),
            ("testuser2@example.com", "Test123456"),
            ("admin@qassure.ai", "admin123"),
        ]
        
        for email, password in test_users:
            if self.login(email, password):
                return email, password
        return None, None
    
    def test_case(self, test: TestCase) -> TestCase:
        """Execute a single test case"""
        # Parse input parameters
        body = None
        params = None
        use_token = True
        custom_headers = {}
        
        input_str = test.input_params.lower()
        
        # Determine if token needed
        if "no token" in input_str or "invalid token" in input_str or "missing" in input_str:
            use_token = False
            if "invalid token" in input_str:
                custom_headers = {"Authorization": "Bearer invalid_token_12345"}
        
        # Parse body
        if "body:" in test.input_params.lower():
            try:
                body_start = test.input_params.find("{")
                body_end = test.input_params.rfind("}") + 1
                if body_start >= 0 and body_end > body_start:
                    body_str = test.input_params[body_start:body_end]
                    # Replace placeholders
                    body_str = body_str.replace("valid@example.com", "testuser2@example.com")
                    body_str = body_str.replace("correctpass", "Test123456")
                    body_str = body_str.replace("wrongpass", "wrongpassword123")
                    body_str = body_str.replace("nonexistent@example.com", "nonexistent123@example.com")
                    body = json.loads(body_str)
            except:
                pass
        
        # Parse query params
        if "query:" in test.input_params.lower():
            params = {}
            if "page=" in test.input_params:
                try:
                    page = test.input_params.split("page=")[1].split()[0]
                    params['page'] = int(page) if page.isdigit() else 1
                except:
                    pass
            if "limit=" in test.input_params:
                try:
                    limit = test.input_params.split("limit=")[1].split()[0]
                    params['limit'] = int(limit) if limit.isdigit() else 20
                except:
                    pass
            if "status=" in test.input_params:
                try:
                    status = test.input_params.split("status=")[1].split()[0].replace(",", "").strip()
                    params['status'] = status
                except:
                    pass
        
        # Handle path parameters
        endpoint = test.endpoint
        if "{id}" in endpoint or "valid_id" in test.input_params:
            # Try to get a real ID
            if "/users/" in endpoint and self.user_id:
                endpoint = endpoint.replace("{id}", self.user_id).replace("valid_id", self.user_id)
            elif "/tenants/" in endpoint and self.tenant_id:
                endpoint = endpoint.replace("{id}", self.tenant_id).replace("valid_id", self.tenant_id)
            elif "invalid_id" in test.input_params or "non-existent" in test.description.lower():
                endpoint = endpoint.replace("{id}", "00000000-0000-0000-0000-000000000000")
        
        # Make request
        status, response, duration = self.make_request(
            test.method, endpoint, body, params, custom_headers, use_token
        )
        
        test.actual_status = status
        test.duration = duration
        
        # Format response
        try:
            resp_str = json.dumps(response, indent=2)
            if len(resp_str) > 500:
                resp_str = resp_str[:500] + "... (truncated)"
            test.actual_response = resp_str
        except:
            test.actual_response = str(response)[:500]
        
        # Determine pass/fail
        expected_statuses = []
        expected_lower = test.expected_response.lower()
        if "200" in test.expected_response or "ok" in expected_lower:
            expected_statuses.append(200)
        if "201" in test.expected_response or "created" in expected_lower:
            expected_statuses.append(201)
        if "400" in test.expected_response or "bad request" in expected_lower or "validation" in expected_lower:
            expected_statuses.append(400)
        if "401" in test.expected_response or "unauthorized" in expected_lower:
            expected_statuses.append(401)
        if "403" in test.expected_response or "forbidden" in expected_lower:
            expected_statuses.append(403)
        if "404" in test.expected_response or "not found" in expected_lower:
            expected_statuses.append(404)
        if "409" in test.expected_response or "conflict" in expected_lower:
            expected_statuses.append(409)
        
        if expected_statuses and status in expected_statuses:
            test.pass_fail = "PASS"
        elif not expected_statuses and 200 <= status < 300:
            test.pass_fail = "PASS"
        elif status == 0:
            test.pass_fail = "FAIL"
            test.error = "Connection error"
        else:
            test.pass_fail = "FAIL"
            test.error = f"Expected one of {expected_statuses}, got {status}"
        
        return test
    
    def run_all_tests(self):
        """Run comprehensive test suite"""
        print(f"{Colors.BLUE}{'='*80}{Colors.END}")
        print(f"{Colors.BLUE}QAssure API Comprehensive Test Suite{Colors.END}")
        print(f"{Colors.BLUE}{'='*80}{Colors.END}\n")
        
        # Try to login
        print(f"{Colors.CYAN}Attempting to login...{Colors.END}")
        email, password = self.find_test_user()
        if not email:
            print(f"{Colors.YELLOW}Warning: Could not find valid test user. Some tests may fail.{Colors.END}")
            print(f"{Colors.YELLOW}Trying to proceed with tests anyway...{Colors.END}\n")
        else:
            print(f"{Colors.GREEN}✓ Logged in as: {email}{Colors.END}\n")
        
        # Define test cases from the use cases document
        self.define_test_cases()
        
        # Run tests
        print(f"{Colors.CYAN}Running {len(self.test_cases)} test cases...{Colors.END}\n")
        for i, test in enumerate(self.test_cases, 1):
            print(f"[{i}/{len(self.test_cases)}] Testing: {test.description[:60]}...", end=" ")
            self.test_case(test)
            status_color = Colors.GREEN if test.pass_fail == "PASS" else Colors.RED
            print(f"{status_color}{test.pass_fail}{Colors.END} ({test.actual_status})")
        
        print(f"\n{Colors.CYAN}Generating report...{Colors.END}\n")
        self.generate_report()
        
        # Print summary
        passed = sum(1 for t in self.test_cases if t.pass_fail == "PASS")
        failed = sum(1 for t in self.test_cases if t.pass_fail == "FAIL")
        not_run = sum(1 for t in self.test_cases if t.pass_fail == "NOT_RUN")
        
        print(f"\n{Colors.BLUE}{'='*80}{Colors.END}")
        print(f"{Colors.GREEN}Passed: {passed}{Colors.END}")
        print(f"{Colors.RED}Failed: {failed}{Colors.END}")
        if not_run > 0:
            print(f"{Colors.YELLOW}Not Run: {not_run}{Colors.END}")
        print(f"Total: {len(self.test_cases)}")
        print(f"Pass Rate: {(passed/len(self.test_cases)*100):.1f}%")
        print(f"{Colors.BLUE}{'='*80}{Colors.END}\n")
    
    def define_test_cases(self):
        """Define all test cases from use cases document"""
        # Authentication Tests
        self.test_cases.extend([
            TestCase("Authentication", "/auth/login", "POST", 
                "Valid credentials: Successful login",
                'Body: {"email": "valid@example.com", "password": "correctpass"}',
                "200 OK, tokens returned",
                "Pass if tokens returned"),
            TestCase("Authentication", "/auth/login", "POST",
                "Invalid email: Non-existent email",
                'Body: {"email": "nonexistent@example.com", "password": "any"}',
                "401 Unauthorized",
                "Pass if rejects"),
            TestCase("Authentication", "/auth/login", "POST",
                "Invalid password: Correct email, wrong password",
                'Body: {"email": "valid@example.com", "password": "wrongpass"}',
                "401 Unauthorized",
                "Pass if rejects"),
            TestCase("Authentication", "/auth/login", "POST",
                "Empty email: Missing or empty email field",
                'Body: {"email": "", "password": "pass"}',
                "400 Bad Request, validation error",
                "Pass if validates"),
            TestCase("Authentication", "/auth/login", "POST",
                "Invalid email format: Malformed email",
                'Body: {"email": "invalidemail", "password": "pass"}',
                "400 Bad Request, validation error",
                "Pass if validates"),
            TestCase("Authentication", "/auth/login", "POST",
                "Empty password: Missing or empty password",
                'Body: {"email": "valid@example.com", "password": ""}',
                "400 Bad Request, validation error",
                "Pass if validates"),
            TestCase("Authentication", "/auth/login", "POST",
                "No body: Empty request body",
                "Body: {}",
                "400 Bad Request, missing required fields",
                "Pass if validates"),
            TestCase("Authentication", "/auth/logout", "POST",
                "Valid logout: With valid token",
                "Body: {}",
                "200 OK, logged out",
                "Pass if succeeds"),
            TestCase("Authentication", "/auth/logout", "POST",
                "Invalid token: Expired or malformed token",
                "Headers: Authorization: Bearer invalid_token",
                "401 Unauthorized",
                "Pass if rejects"),
            TestCase("Authentication", "/auth/logout", "POST",
                "No token: Missing Authorization header",
                "Body: {}",
                "401 Unauthorized",
                "Pass if requires auth"),
        ])
        
        # Tenant Tests
        self.test_cases.extend([
            TestCase("Tenants", "/tenants", "GET",
                "Valid fetch: All tenants with default params",
                "Query: page=1, limit=20",
                "200 OK, tenant list",
                "Pass if returns list"),
            TestCase("Tenants", "/tenants", "GET",
                "Filtered by status: Active only",
                "Query: status=active",
                "200 OK, only active tenants",
                "Pass if filters"),
            TestCase("Tenants", "/tenants/{id}", "GET",
                "Valid ID: Existing tenant",
                "Path: valid_id",
                "200 OK, tenant object",
                "Pass if returns data"),
            TestCase("Tenants", "/tenants/{id}", "GET",
                "Non-existent ID",
                "Path: invalid_id",
                "404 Not Found",
                "Pass if 404"),
            TestCase("Tenants", "/tenants", "GET",
                "Unauthorized: No token or invalid",
                "No token",
                "401 Unauthorized",
                "Pass if protects"),
        ])
        
        # User Tests
        self.test_cases.extend([
            TestCase("Users", "/users", "GET",
                "Valid list: Default params",
                "Query: defaults",
                "200, users list",
                "Pass if returns"),
            TestCase("Users", "/users/{id}", "GET",
                "Valid user",
                "Path: valid_id",
                "200, user object",
                "Pass if correct"),
            TestCase("Users", "/users/{id}", "GET",
                "Non-existent",
                "Path: invalid",
                "404 Not Found",
                "Pass if 404"),
            TestCase("Users", "/users", "GET",
                "Unauthorized",
                "No token",
                "401 Unauthorized",
                "Pass if protects"),
        ])
        
        # Role Tests
        self.test_cases.extend([
            TestCase("Roles", "/roles", "GET",
                "Valid list",
                "Defaults",
                "200, roles",
                "Pass if returns"),
            TestCase("Roles", "/roles", "GET",
                "Filtered by scope",
                "Query: scope=tenant",
                "200 filtered",
                "Pass if correct"),
            TestCase("Roles", "/roles/{id}", "GET",
                "Valid role",
                "Path: valid_id",
                "200 object",
                "Pass if correct"),
            TestCase("Roles", "/roles/{id}", "GET",
                "Non-existent",
                "Path: invalid",
                "404 Not Found",
                "Pass if 404"),
            TestCase("Roles", "/roles", "POST",
                "Duplicate code",
                'Body: {"name": "Test Role", "code": "existing_code", "scope": "tenant"}',
                "400/409 - Role code already exists",
                "Pass if prevents"),
            TestCase("Roles", "/roles", "POST",
                "Duplicate name",
                'Body: {"name": "existing_name", "code": "new_code", "scope": "tenant"}',
                "400/409 - Role name already exists",
                "Pass if prevents"),
            TestCase("Roles", "/roles", "GET",
                "Unauthorized",
                "No token",
                "401 Unauthorized",
                "Pass if protects"),
        ])
        
        # Module Tests
        self.test_cases.extend([
            TestCase("Modules", "/modules", "GET",
                "Valid list",
                "Defaults",
                "200, modules",
                "Pass if returns"),
            TestCase("Modules", "/modules/{id}", "GET",
                "Non-existent",
                "Path: invalid",
                "404 Not Found",
                "Pass if 404"),
        ])
        
        # Audit Log Tests
        self.test_cases.extend([
            TestCase("Audit Logs", "/audit-logs", "GET",
                "Valid list",
                "Defaults",
                "200, logs",
                "Pass if returns"),
            TestCase("Audit Logs", "/audit-logs/{id}", "GET",
                "Non-existent",
                "Path: invalid",
                "404 Not Found",
                "Pass if 404"),
        ])
    
    def generate_report(self):
        """Generate client-ready markdown report"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        passed = sum(1 for t in self.test_cases if t.pass_fail == "PASS")
        failed = sum(1 for t in self.test_cases if t.pass_fail == "FAIL")
        total = len(self.test_cases)
        
        report = f"""# QAssure API Test Report

**Generated:** {timestamp}  
**Base URL:** {self.base_url}  
**Test User:** {self.user_id or 'Not logged in'}

## Executive Summary

| Metric | Count | Percentage |
|--------|-------|------------|
| Total Tests | {total} | 100% |
| Passed | {passed} | {(passed/total*100):.1f}% |
| Failed | {failed} | {(failed/total*100):.1f}% |
| Pass Rate | {passed}/{total} | {(passed/total*100):.1f}% |

## Test Results by Category

"""
        
        # Group by category
        categories = {}
        for test in self.test_cases:
            if test.category not in categories:
                categories[test.category] = []
            categories[test.category].append(test)
        
        for category, tests in categories.items():
            cat_passed = sum(1 for t in tests if t.pass_fail == "PASS")
            cat_total = len(tests)
            report += f"### {category}\n\n"
            report += f"**Results:** {cat_passed}/{cat_total} passed ({(cat_passed/cat_total*100):.1f}%)\n\n"
            
            report += """| # | Test Case | Method | Endpoint | Expected | Actual Status | Actual Response | Pass/Fail | Duration |
|---|-----------|--------|----------|----------|---------------|-----------------|-----------|----------|
"""
            
            for i, test in enumerate(tests, 1):
                status_icon = "✓" if test.pass_fail == "PASS" else "✗"
                response_preview = test.actual_response[:100].replace("\n", " ") + "..." if len(test.actual_response) > 100 else test.actual_response.replace("\n", " ")
                report += f"| {i} | {test.description} | {test.method} | {test.endpoint} | {test.expected_response[:50]}... | {test.actual_status} | {response_preview} | {status_icon} {test.pass_fail} | {test.duration:.3f}s |\n"
            
            report += "\n"
        
        # Detailed results section
        report += """## Detailed Test Results

"""
        
        for test in self.test_cases:
            report += f"""### Test: {test.description}

- **Category:** {test.category}
- **Endpoint:** {test.method} {test.endpoint}
- **Input Parameters:** {test.input_params}
- **Expected Response:** {test.expected_response}
- **Actual Status Code:** {test.actual_status}
- **Actual Response:** 
```json
{test.actual_response}
```
- **Pass/Fail:** {test.pass_fail}
- **Criteria:** {test.criteria}
- **Duration:** {test.duration:.3f}s
"""
            if test.error:
                report += f"- **Error:** {test.error}\n"
            report += "\n---\n\n"
        
        # Write report
        output_file = "dev/readme-file/QAssure-API-Test-Report.md"
        with open(output_file, 'w') as f:
            f.write(report)
        
        print(f"{Colors.GREEN}✓ Report generated: {output_file}{Colors.END}")

if __name__ == "__main__":
    tester = APITester()
    tester.run_all_tests()
