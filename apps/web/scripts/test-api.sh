#!/bin/bash

# Configuration
API_KEY_PROD="sk_adf6de48034ad63df28d2605b55005d69e35c46b5b53f70b"  # Replace with your API key
API_KEY="sk_41ed0a46c3708bdfcab37ac468df4cacb16a78ff3dfe6c79" 
BASE_URL_PROD="https://cm.cip.org"
BASE_URL="http://localhost:3000"
POLL_ID_PROD="cm66znpyq0000128sdy83do71"  # Replace with an existing poll ID
POLL_ID="cm66zy1e70000nhhh9hxmetna"
INVALID_POLL_ID="cm000000000000000000000000"
INVALID_API_KEY="sk_000000000000000000000000000000000000000000000000"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "Testing CommunityModels API endpoints..."

# Helper function to test error cases
test_error_case() {
    local response=$1
    local expected_error=$2
    local error_message=$(echo $response | jq -r '.error')
    
    if [[ "$error_message" == "$expected_error" ]]; then
        echo -e "${GREEN}✓ Expected error: $expected_error${NC}"
    else
        echo -e "${RED}✗ Expected error '$expected_error' but got '$error_message'${NC}"
    fi
}

# Helper function to test OpenAI-compatible error cases
test_openai_error_case() {
    local response=$1
    local expected_error=$2
    local error_message=$(echo $response | jq -r '.error.message')
    
    if [[ "$error_message" == "$expected_error" ]]; then
        echo -e "${GREEN}✓ Expected error: $expected_error${NC}"
    else
        echo -e "${RED}✗ Expected error '$expected_error' but got '$error_message'${NC}"
    fi
}

# 1. Authentication Tests
echo -e "\n${YELLOW}Testing Authentication...${NC}"

# Test missing API key
echo "Testing missing API key..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/polls/$POLL_ID" \
  -H "Content-Type: application/json" \
  -d '{}')
test_error_case "$RESPONSE" "Invalid authentication"

# Test invalid API key
echo "Testing invalid API key..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/polls/$POLL_ID" \
  -H "Authorization: Bearer $INVALID_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{}')
test_error_case "$RESPONSE" "Invalid API key"

# 2. Poll Verification Tests
echo -e "\n${YELLOW}Testing Poll Verification...${NC}"

# Test invalid poll ID
echo "Testing invalid poll ID..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/polls/$INVALID_POLL_ID" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{}')
test_error_case "$RESPONSE" "Poll not found"

# Test valid poll
echo "Testing valid poll..."
POLL_RESPONSE=$(curl -s -X POST "$BASE_URL/api/polls/$POLL_ID" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{}')

if [[ $(echo $POLL_RESPONSE | jq -r '.error') == "null" ]]; then
    echo -e "${GREEN}✓ Poll exists and is accessible${NC}"
else
    echo -e "${RED}✗ Error accessing poll${NC}"
    exit 1
fi

# 3. Statement Submission Tests
echo -e "\n${YELLOW}Testing Statement Submission...${NC}"

# Test missing content
echo "Testing missing content..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/polls/$POLL_ID/statements" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "anonymousId": "test-user-123"
  }')
test_error_case "$RESPONSE" "Content is required"

# Test missing anonymousId
echo "Testing missing anonymousId..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/polls/$POLL_ID/statements" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Test statement"
  }')
test_error_case "$RESPONSE" "AnonymousId is required"

# Test valid statement submission
echo "Testing valid statement submission..."
STATEMENT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/polls/$POLL_ID/statements" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "The AI should be helpful and honest",
    "anonymousId": "test-user-123"
  }')

if [[ $(echo $STATEMENT_RESPONSE | jq -r '.error') == "null" ]]; then
    STATEMENT_ID=$(echo $STATEMENT_RESPONSE | jq -r '.uid')
    echo -e "${GREEN}✓ Statement submitted with ID: $STATEMENT_ID${NC}"
else
    echo -e "${RED}✗ Error submitting statement${NC}"
    echo $STATEMENT_RESPONSE | jq '.'
    exit 1
fi

# 4. Vote Submission Tests
echo -e "\n${YELLOW}Testing Vote Submission...${NC}"

# Test invalid statement ID
echo "Testing invalid statement ID..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/polls/$POLL_ID/votes" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "statementId": "invalid_statement_id",
    "vote": "AGREE",
    "anonymousId": "test-user-123"
  }')
test_error_case "$RESPONSE" "Statement not found"

# Test invalid vote value
echo "Testing invalid vote value..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/polls/$POLL_ID/votes" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"statementId\": \"$STATEMENT_ID\",
    \"vote\": \"INVALID_VOTE\",
    \"anonymousId\": \"test-user-123\"
  }")
test_error_case "$RESPONSE" "Invalid vote value"

# Test valid vote submission
echo "Testing valid vote submission..."
VOTE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/polls/$POLL_ID/votes" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"statementId\": \"$STATEMENT_ID\",
    \"vote\": \"AGREE\",
    \"anonymousId\": \"test-user-123\"
  }")

if [[ $(echo $VOTE_RESPONSE | jq -r '.error') == "null" ]]; then
    echo -e "${GREEN}✓ Vote submitted successfully${NC}"
else
    echo -e "${RED}✗ Error submitting vote${NC}"
    echo $VOTE_RESPONSE | jq '.'
    exit 1
fi

# 5. Chat Completions Tests
echo -e "\n${YELLOW}Testing Chat Completions...${NC}"

# Test missing API key
echo "Testing missing API key..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello"}]
  }')
test_openai_error_case "$RESPONSE" "Invalid authentication. Expected Bearer token"

# Test invalid API key
echo "Testing invalid API key..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/chat/completions" \
  -H "Authorization: Bearer $INVALID_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello"}]
  }')
test_openai_error_case "$RESPONSE" "Invalid API key"

# Test invalid messages format
echo "Testing invalid messages format..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/chat/completions" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": "not an array"
  }')
test_openai_error_case "$RESPONSE" "messages must be an array"

# Test valid chat completion
echo "Testing valid chat completion..."
CHAT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/chat/completions" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "you tell me\n\n    IMPORTANT: The data you return should follow this structure:\n<thinking>{String}</thinking>\n<draft_response>{String}</draft_response>\n<response_metrics>{String}</response_metrics>\n<improvement_strategy>{String}</improvement_strategy>\n<final_response>{String}</final_response>\n"
      }
    ],
    "temperature": 0.72,
    "top_p": 1,
    "presence_penalty": 0,
    "stop": null,
    "max_tokens": 3000
  }')

if [[ $(echo $CHAT_RESPONSE | jq -r '.error') == "null" ]]; then
    RESPONSE_CONTENT=$(echo $CHAT_RESPONSE | jq -r '.choices[0].message.content')
    if [[ ! -z "$RESPONSE_CONTENT" ]]; then
        echo -e "${GREEN}✓ Chat completion successful${NC}"
        echo -e "${YELLOW}Response: $RESPONSE_CONTENT${NC}"
    else
        echo -e "${RED}✗ Chat completion returned empty response${NC}"
        exit 1
    fi
else
    ERROR_MSG=$(echo $CHAT_RESPONSE | jq -r '.error.message')
    echo -e "${RED}✗ Error in chat completion: $ERROR_MSG${NC}"
    exit 1
fi

echo -e "\n${GREEN}Testing complete!${NC}" 