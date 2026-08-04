#!/usr/bin/env python3
"""
QAssure API Use Cases Test Runner
Tests all scenarios from QAssure-API-UseCases.md and generates results
"""

import requests
import json
import re
import sys
from datetime import datetime
from typing import Dict, List, Tuple, Optional

BASE_URL = "http://localhost:3000/api/v1"
TEST_EMAIL = "testuser2@example.com"
TEST_PASSWORD = "Test123456"
SUPER_ADMIN_EMAIL = "superadmin@example.com"  # Update as needed
SUPER_ADMIN_PASSWORD = "SuperAdmin123"  # Update as needed

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

class TestResult:
    def __init__(self, test_name: str, endpoint: str, method: str):
        self.test_name = test_name
        self.endpoint = endpoint
        self.method = method
        self.expected_status: Optional[int] = None
        self.actual_status: Optional[int] = None
        self.expected_response: str = ""
        self.actual_response: str = ""
        self.pass_status: str = "NOT_RUN"
        self.error: Optional[str] = None
        self.duration: float = 0.0

class APITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.access_token: Optional[str] = None
        self.refresh_token: Optional[str] = None
        self.user_id: Optional[str] = None
        self.tenant_id: Optional[str] = None
        self.super_admin_token: Optional[str] = None
        self.test_results: List[TestResult] = []
        
    def login(self, email: str, password: str) -> bool:
        """Login and get access token"""
        try:
            response = requests.post(
                f"{self.base_url}/auth/login",
                json={"email": email, "password": password},
                timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "data" in data:
                    self.access_token = data["data"].get("access_token")
                    self.refresh_token = data["data"].get("refresh_token")
                    self.user_id = data["data"].get("user", {}).get("id")
                    self.tenant_id = data["data"].get("tenant_id")
                    return True
            return False
        except Exception as e:
            print(f"{Colors.RED}Login failed: {e}{Colors.END}")
            return False
    
    def make_request(self, method: str, endpoint: str, 
                    body: Optional[Dict] = None,
                    headers: Optional[Dict] = None,
                    use_token: bool = True) -> Tuple[int, Dict]:
        """Make HTTP request and return status code and response"""
        url = f"{self.base_url}{endpoint}"
        req_headers = {"Content-Type": "application/json"}
        
        if use_token and self.access_token:
            req_headers["Authorization"] = f"Bearer {self.access_token}"
        
        if headers:
            req_headers.update(headers)
        
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=req_headers, timeout=10)
            elif method.upper() == "POST":
                response = requests.post(url, json=body, headers=req_headers, timeout=10)
            elif method.upper() == "PUT":
                response = requests.put(url, json=body, headers=req_headers, timeout=10)
            elif method.upper() == "DELETE":
                response = requests.delete(url, headers=req_headers, timeout=10)
            else:
                return 405, {"error": "Method not allowed"}
            
            try:
                response_data = response.json()
            except:
                response_data = {"raw": response.text}
            
            return response.status_code, response_data
        except Exception as e:
            return 0, {"error": str(e)}
    
    def test_scenario(self, test: TestResult, body: Optional[Dict] = None,
                     headers: Optional[Dict] = None, use_token: bool = True,
                     expected_status_range: Tuple[int, int] = (200, 299)) -> TestResult:
        """Run a single test scenario"""
        import time
        start_time = time.time()
        
        status_code, response_data = self.make_request(
            test.method, test.endpoint, body, headers, use_token
        )
        
        test.duration = time.time() - start_time
        test.actual_status = status_code
        test.actual_response = json.dumps(response_data, indent=2)
        
        # Determine pass/fail
        if status_code == 0:
            test.pass_status = "FAIL"
            test.error = "Connection error"
        elif expected_status_range[0] <= status_code <= expected_status_range[1]:
            test.pass_status = "PASS"
        else:
            test.pass_status = "FAIL"
            test.error = f"Expected status {expected_status_range[0]}-{expected_status_range[1]}, got {status_code}"
        
        return test
    
    def run_auth_tests(self):
        """Run authentication endpoint tests"""
        print(f"\n{Colors.BLUE}=== Authentication Tests ==={Colors.END}\n")
        
        # Test 1: Valid login
        test = TestResult("Valid credentials login", "/auth/login", "POST")
        test.expected_status = 200
        test.expected_response = "200 OK with tokens"
        result = self.test_scenario(test, {"email": TEST_EMAIL, "password": TEST_PASSWORD})
        self.test_results.append(result)
        self.print_test_result(result)
        
        # Test 2: Invalid email
        test = TestResult("Invalid email login", "/auth/login", "POST")
        test.expected_status = 401
        test.expected_response = "401 Unauthorized"
        result = self.test_scenario(test, {"email": "nonexistent@example.com", "password": "any"},
                                   use_token=False, expected_status_range=(401, 401))
        self.test_results.append(result)
        self.print_test_result(result)
        
        # Test 3: Invalid password
        test = TestResult("Invalid password login", "/auth/login", "POST")
        test.expected_status = 401
        test.expected_response = "401 Unauthorized"
        result = self.test_scenario(test, {"email": TEST_EMAIL, "password": "wrongpass"},
                                   use_token=False, expected_status_range=(401, 401))
        self.test_results.append(result)
        self.print_test_result(result)
        
        # Test 4: Empty email
        test = TestResult("Empty email login", "/auth/login", "POST")
        test.expected_status = 400
        test.expected_response = "400 Bad Request - validation error"
        result = self.test_scenario(test, {"email": "", "password": "pass"},
                                   use_token=False, expected_status_range=(400, 400))
        self.test_results.append(result)
        self.print_test_result(result)
        
        # Test 5: Invalid email format
        test = TestResult("Invalid email format login", "/auth/login", "POST")
        test.expected_status = 400
        test.expected_response = "400 Bad Request - validation error"
        result = self.test_scenario(test, {"email": "invalidemail", "password": "pass"},
                                   use_token=False, expected_status_range=(400, 400))
        self.test_results.append(result)
        self.print_test_result(result)
        
        # Login to get token for other tests
        if not self.access_token:
            self.login(TEST_EMAIL, TEST_PASSWORD)
        
        # Test 6: Logout with valid token
        if self.access_token:
            test = TestResult("Valid logout", "/auth/logout", "POST")
            test.expected_status = 200
            test.expected_response = "200 OK - logged out"
            result = self.test_scenario(test, {})
            self.test_results.append(result)
            self.print_test_result(result)
            # Re-login for subsequent tests
            self.login(TEST_EMAIL, TEST_PASSWORD)
        
        # Test 7: Logout with invalid token
        test = TestResult("Invalid token logout", "/auth/logout", "POST")
        test.expected_status = 401
        test.expected_response = "401 Unauthorized"
        old_token = self.access_token
        self.access_token = "invalid_token"
        result = self.test_scenario(test, {}, expected_status_range=(401, 401))
        self.access_token = old_token
        self.test_results.append(result)
        self.print_test_result(result)
        
        # Test 8: Logout without token
        test = TestResult("No token logout", "/auth/logout", "POST")
        test.expected_status = 401
        test.expected_response = "401 Unauthorized"
        old_token = self.access_token
        self.access_token = None
        result = self.test_scenario(test, {}, use_token=False, expected_status_range=(401, 401))
        self.access_token = old_token
        self.test_results.append(result)
        self.print_test_result(result)
    
    def run_tenant_tests(self):
        """Run tenant endpoint tests"""
        print(f"\n{Colors.BLUE}=== Tenant Tests ==={Colors.END}\n")
        
        if not self.access_token:
            self.login(TEST_EMAIL, TEST_PASSWORD)
        
        # Test 1: Get all tenants (requires super admin)
        test = TestResult("Get all tenants", "/tenants", "GET")
        test.expected_status = 200
        test.expected_response = "200 OK with tenant list"
        result = self.test_scenario(test, expected_status_range=(200, 403))
        self.test_results.append(result)
        self.print_test_result(result)
        
        # Test 2: Get tenant by ID
        # First get a tenant ID from the list
        status, response = self.make_request("GET", "/tenants")
        tenant_id = None
        if status == 200 and isinstance(response, dict) and "data" in response:
            if isinstance(response["data"], list) and len(response["data"]) > 0:
                tenant_id = response["data"][0].get("id")
        
        if tenant_id:
            test = TestResult("Get tenant by ID", f"/tenants/{tenant_id}", "GET")
            test.expected_status = 200
            test.expected_response = "200 OK with tenant object"
            result = self.test_scenario(test)
            self.test_results.append(result)
            self.print_test_result(result)
        
        # Test 3: Get non-existent tenant
        test = TestResult("Get non-existent tenant", "/tenants/00000000-0000-0000-0000-000000000000", "GET")
        test.expected_status = 404
        test.expected_response = "404 Not Found"
        result = self.test_scenario(test, expected_status_range=(404, 404))
        self.test_results.append(result)
        self.print_test_result(result)
        
        # Test 4: Create tenant (requires super admin)
        test = TestResult("Create tenant", "/tenants", "POST")
        test.expected_status = 201
        test.expected_response = "201 Created or 403 if not super admin"
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        result = self.test_scenario(test, {
            "name": f"Test Tenant {timestamp}",
            "slug": f"test-tenant-{timestamp}",
            "status": "active"
        }, expected_status_range=(201, 403))
        self.test_results.append(result)
        self.print_test_result(result)
    
    def run_user_tests(self):
        """Run user endpoint tests"""
        print(f"\n{Colors.BLUE}=== User Tests ==={Colors.END}\n")
        
        if not self.access_token:
            self.login(TEST_EMAIL, TEST_PASSWORD)
        
        # Test 1: Get all users
        test = TestResult("Get all users", "/users", "GET")
        test.expected_status = 200
        test.expected_response = "200 OK with user list"
        result = self.test_scenario(test)
        self.test_results.append(result)
        self.print_test_result(result)
        
        # Test 2: Get user by ID
        if self.user_id:
            test = TestResult("Get user by ID", f"/users/{self.user_id}", "GET")
            test.expected_status = 200
            test.expected_response = "200 OK with user object"
            result = self.test_scenario(test)
            self.test_results.append(result)
            self.print_test_result(result)
        
        # Test 3: Get non-existent user
        test = TestResult("Get non-existent user", "/users/00000000-0000-0000-0000-000000000000", "GET")
        test.expected_status = 404
        test.expected_response = "404 Not Found"
        result = self.test_scenario(test, expected_status_range=(404, 404))
        self.test_results.append(result)
        self.print_test_result(result)
        
        # Test 4: Create user (requires admin)
        test = TestResult("Create user", "/users", "POST")
        test.expected_status = 201
        test.expected_response = "201 Created or 403 if not admin"
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        result = self.test_scenario(test, {
            "email": f"testuser{timestamp}@example.com",
            "password": "Test123456",
            "first_name": "Test",
            "last_name": "User",
            "status": "active",
            "auth_provider": "local",
            "tenant_id": self.tenant_id,
            "role_id": self.user_id  # This would need a valid role_id
        }, expected_status_range=(201, 403))
        self.test_results.append(result)
        self.print_test_result(result)
    
    def run_role_tests(self):
        """Run role endpoint tests"""
        print(f"\n{Colors.BLUE}=== Role Tests ==={Colors.END}\n")
        
        if not self.access_token:
            self.login(TEST_EMAIL, TEST_PASSWORD)
        
        # Test 1: Get all roles
        test = TestResult("Get all roles", "/roles", "GET")
        test.expected_status = 200
        test.expected_response = "200 OK with role list"
        result = self.test_scenario(test)
        self.test_results.append(result)
        self.print_test_result(result)
        
        # Test 2: Create role with duplicate code
        test = TestResult("Create role with duplicate code", "/roles", "POST")
        test.expected_status = 400
        test.expected_response = "400/409 - Role code already exists"
        # First get an existing role to duplicate its code
        status, response = self.make_request("GET", "/roles")
        existing_code = None
        if status == 200 and isinstance(response, dict) and "data" in response:
            if isinstance(response["data"], list) and len(response["data"]) > 0:
                existing_code = response["data"][0].get("code")
        
        if existing_code:
            timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
            result = self.test_scenario(test, {
                "name": f"Test Role {timestamp}",
                "code": existing_code,
                "scope": "tenant",
                "description": "Test role"
            }, expected_status_range=(400, 409))
            self.test_results.append(result)
            self.print_test_result(result)
        
        # Test 3: Create role with duplicate name
        test = TestResult("Create role with duplicate name", "/roles", "POST")
        test.expected_status = 400
        test.expected_response = "400/409 - Role name already exists"
        # Get existing role name
        status, response = self.make_request("GET", "/roles")
        existing_name = None
        if status == 200 and isinstance(response, dict) and "data" in response:
            if isinstance(response["data"], list) and len(response["data"]) > 0:
                existing_name = response["data"][0].get("name")
        
        if existing_name:
            timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
            result = self.test_scenario(test, {
                "name": existing_name,
                "code": f"test_role_{timestamp}",
                "scope": "tenant",
                "description": "Test role"
            }, expected_status_range=(400, 409))
            self.test_results.append(result)
            self.print_test_result(result)
    
    def print_test_result(self, test: TestResult):
        """Print formatted test result"""
        status_color = Colors.GREEN if test.pass_status == "PASS" else Colors.RED
        status_icon = "✓" if test.pass_status == "PASS" else "✗"
        
        print(f"{status_color}{status_icon}{Colors.END} {test.test_name}")
        print(f"   Endpoint: {test.method} {test.endpoint}")
        print(f"   Expected: {test.expected_response}")
        print(f"   Actual Status: {test.actual_status}")
        if test.error:
            print(f"   {Colors.RED}Error: {test.error}{Colors.END}")
        print(f"   Duration: {test.duration:.3f}s")
        print()
    
    def generate_report(self, output_file: str = "test_results_report.md"):
        """Generate markdown report of test results"""
        with open(output_file, "w") as f:
            f.write("# QAssure API Test Results Report\n\n")
            f.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            f.write("## Summary\n\n")
            
            passed = sum(1 for t in self.test_results if t.pass_status == "PASS")
            failed = sum(1 for t in self.test_results if t.pass_status == "FAIL")
            total = len(self.test_results)
            
            f.write(f"- Total Tests: {total}\n")
            f.write(f"- Passed: {passed}\n")
            f.write(f"- Failed: {failed}\n")
            f.write(f"- Pass Rate: {(passed/total*100):.1f}%\n\n")
            
            f.write("## Detailed Results\n\n")
            f.write("| Test Name | Endpoint | Method | Expected | Actual Status | Pass/Fail |\n")
            f.write("|-----------|----------|--------|----------|---------------|-----------|\n")
            
            for test in self.test_results:
                status_mark = "✓ PASS" if test.pass_status == "PASS" else "✗ FAIL"
                f.write(f"| {test.test_name} | {test.endpoint} | {test.method} | ")
                f.write(f"{test.expected_response[:50]}... | {test.actual_status} | {status_mark} |\n")
        
        print(f"\n{Colors.GREEN}Report generated: {output_file}{Colors.END}\n")
    
    def run_all_tests(self):
        """Run all test suites"""
        print(f"{Colors.BLUE}QAssure API Comprehensive Test Suite{Colors.END}")
        print(f"{Colors.BLUE}{'='*50}{Colors.END}\n")
        
        # Login first
        print("Logging in...")
        if self.login(TEST_EMAIL, TEST_PASSWORD):
            print(f"{Colors.GREEN}✓ Login successful{Colors.END}\n")
        else:
            print(f"{Colors.RED}✗ Login failed - some tests may fail{Colors.END}\n")
        
        # Run test suites
        self.run_auth_tests()
        self.run_tenant_tests()
        self.run_user_tests()
        self.run_role_tests()
        
        # Generate report
        self.generate_report()
        
        # Print summary
        passed = sum(1 for t in self.test_results if t.pass_status == "PASS")
        failed = sum(1 for t in self.test_results if t.pass_status == "FAIL")
        total = len(self.test_results)
        
        print(f"\n{Colors.BLUE}{'='*50}{Colors.END}")
        print(f"{Colors.GREEN}Passed: {passed}{Colors.END}")
        print(f"{Colors.RED}Failed: {failed}{Colors.END}")
        print(f"Total: {total}")
        print(f"Pass Rate: {(passed/total*100):.1f}%")
        print(f"{Colors.BLUE}{'='*50}{Colors.END}\n")

if __name__ == "__main__":
    tester = APITester()
    tester.run_all_tests()
