#!/bin/bash

# Replace this with an actual poll ID from your database
POLL_ID="cm7yf3he90000h4yzb5oyurgi"

# Test the local endpoint
echo "Testing local GAC update endpoint with poll ID: $POLL_ID"
curl -X POST \
  http://localhost:6000/api/update-gac-scores \
  -H "Content-Type: application/json" \
  -d "{\"pollId\": \"$POLL_ID\", \"force\": true}" \
  -v

# To use this script:
# 1. Replace "your-poll-id-here" with an actual poll ID
# 2. Make the script executable: chmod +x test_gac_update.sh
# 3. Run it: ./test_gac_update.sh 