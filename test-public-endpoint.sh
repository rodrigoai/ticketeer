#!/bin/bash

# Test script for Public Ticket Search API
# This script tests all scenarios for the new public endpoint

echo "🧪 Testing Public Ticket Search API"
echo "===================================="

BASE_URL="http://localhost:3000"
ENDPOINT="/api/public/tickets/search"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
TEST_COUNT=0
PASSED_COUNT=0

# Function to run test
run_test() {
    local test_name="$1"
    local curl_cmd="$2"
    local expected_status="$3"
    local expected_message="$4"
    
    ((TEST_COUNT++))
    echo -e "\n${BLUE}Test $TEST_COUNT: $test_name${NC}"
    echo "Command: $curl_cmd"
    
    # Run the curl command and capture response and status
    response=$(eval $curl_cmd 2>/dev/null)
    status=$(curl -s -w "%{http_code}" -o /dev/null "$curl_cmd" 2>/dev/null | tail -1)
    
    echo "Response: $response"
    echo "HTTP Status: $status"
    
    # Check if status matches expected
    if [ "$status" = "$expected_status" ]; then
        if [[ "$response" == *"$expected_message"* ]]; then
            echo -e "${GREEN}✅ PASSED${NC}"
            ((PASSED_COUNT++))
        else
            echo -e "${RED}❌ FAILED - Message doesn't match${NC}"
            echo "Expected message to contain: $expected_message"
        fi
    else
        echo -e "${RED}❌ FAILED - Status code mismatch${NC}"
        echo "Expected: $expected_status, Got: $status"
    fi
}

echo -e "\n${YELLOW}=== VALIDATION TESTS ===${NC}"

# Test 1: Missing userId parameter
run_test "Missing userId parameter" \
    "curl -s '$BASE_URL$ENDPOINT?eventId=1'" \
    "400" \
    "userId parameter is required"

# Test 2: Missing eventId parameter  
run_test "Missing eventId parameter" \
    "curl -s '$BASE_URL$ENDPOINT?userId=testuser'" \
    "400" \
    "eventId parameter is required"

# Test 3: Invalid eventId (non-numeric)
run_test "Invalid eventId (non-numeric)" \
    "curl -s '$BASE_URL$ENDPOINT?userId=testuser&eventId=invalid'" \
    "400" \
    "eventId must be a valid number"

# Test 4: Invalid available parameter
run_test "Invalid available parameter" \
    "curl -s '$BASE_URL$ENDPOINT?userId=testuser&eventId=1&available=invalid'" \
    "400" \
    "Available parameter must be"

echo -e "\n${YELLOW}=== USER VALIDATION TESTS ===${NC}"

# Test 5: Nonexistent user
run_test "Nonexistent user" \
    "curl -s '$BASE_URL$ENDPOINT?userId=nonexistent-user&eventId=1'" \
    "404" \
    "does not exist or has no events"

# Test 6: Valid format but nonexistent event for existing user (this will also fail with user not found for now)
run_test "Valid userId format but nonexistent event" \
    "curl -s '$BASE_URL$ENDPOINT?userId=google-oauth2%7Ctest123&eventId=999'" \
    "404" \
    "User with ID"

echo -e "\n${YELLOW}=== PARAMETER FORMAT TESTS ===${NC}"

# Test 7: URL encoding test
run_test "URL encoded userId (Auth0 format)" \
    "curl -s '$BASE_URL$ENDPOINT?userId=google-oauth2%7Cuser123&eventId=1'" \
    "404" \
    "User with ID"  # This should return 404 since user doesn't exist

# Test 8: available=true parameter
run_test "Available parameter set to true" \
    "curl -s '$BASE_URL$ENDPOINT?userId=testuser&eventId=1&available=true'" \
    "404" \
    "does not exist"

# Test 9: available=false parameter
run_test "Available parameter set to false" \
    "curl -s '$BASE_URL$ENDPOINT?userId=testuser&eventId=1&available=false'" \
    "404" \
    "does not exist"

echo -e "\n${YELLOW}=== ENDPOINT AVAILABILITY TESTS ===${NC}"

# Test 10: Check if endpoint exists (should not return 404 for route not found)
run_test "Endpoint exists and responds" \
    "curl -s '$BASE_URL$ENDPOINT?userId=test&eventId=1'" \
    "404" \
    "User with ID"  # Should get user not found, not route not found

# Test 11: HTTP method test (should work with GET)
run_test "GET method works" \
    "curl -s -X GET '$BASE_URL$ENDPOINT?userId=test&eventId=1'" \
    "404" \
    "User with ID"

echo -e "\n${YELLOW}=== PRIVACY PROTECTION TEST ===${NC}"

# Test 12: Verify no authentication headers are needed
run_test "No authentication required" \
    "curl -s '$BASE_URL$ENDPOINT?userId=test&eventId=1' -H 'Authorization: Bearer fake-token'" \
    "404" \
    "User with ID"  # Should still process without auth error

echo -e "\n${BLUE}=== TEST SUMMARY ===${NC}"
echo "Tests run: $TEST_COUNT"
echo "Tests passed: $PASSED_COUNT"
echo "Tests failed: $((TEST_COUNT - PASSED_COUNT))"

if [ $PASSED_COUNT -eq $TEST_COUNT ]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi