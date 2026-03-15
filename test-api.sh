#!/bin/bash
#  Test API Endpoints - NOLYSS Authentication
# Usage: bash test-api.sh
# Make sure backend is running on http://localhost:5000

BASE_URL="http://localhost:5000/api"
EMAIL="testuser@example.com"
PASSWORD="TestPassword123!"
RESET_TOKEN=""
VERIFY_TOKEN=""

echo " Starting Authentication API Tests..."
echo "================================================"

# Test 1: Register
echo ""
echo "1️  Testing POST /auth/register"
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Test User\",
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\",
    \"role\": \"teamMember\"
  }")

echo "Response: $REGISTER_RESPONSE"
ACCESS_TOKEN=$(echo $REGISTER_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
REFRESH_TOKEN=$(echo $REGISTER_RESPONSE | grep -o '"refreshToken":"[^"]*' | cut -d'"' -f4)
VERIFY_TOKEN=$(echo $REGISTER_RESPONSE | grep -o '"verification":"[^"]*' | cut -d'"' -f4)

if [ ! -z "$ACCESS_TOKEN" ]; then
  echo " Registration successful - Access Token obtained"
else
  echo " Registration failed"
fi

# Test 2: Verify Email
echo ""
echo "2️  Testing POST /auth/verify-email"
if [ ! -z "$VERIFY_TOKEN" ]; then
  VERIFY_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/verify-email" \
    -H "Content-Type: application/json" \
    -d "{\"token\": \"$VERIFY_TOKEN\"}")
  echo "Response: $VERIFY_RESPONSE"
  if echo $VERIFY_RESPONSE | grep -q "vérifiée"; then
    echo " Email verification successful"
  fi
else
  echo "  Skip - No verify token (configure SMTP in .env)"
fi

# Test 3: Login
echo ""
echo "3️  Testing POST /auth/login"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\"
  }")

echo "Response: $LOGIN_RESPONSE"
ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
REFRESH_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"refreshToken":"[^"]*' | cut -d'"' -f4)

if [ ! -z "$ACCESS_TOKEN" ]; then
  echo " Login successful - Access Token: ${ACCESS_TOKEN:0:20}..."
else
  echo " Login failed"
fi

# Test 4: Get Current User
echo ""
echo "4️  Testing GET /auth/me (Protected)"
if [ ! -z "$ACCESS_TOKEN" ]; then
  ME_RESPONSE=$(curl -s -X GET "$BASE_URL/auth/me" \
    -H "Authorization: Bearer $ACCESS_TOKEN")
  echo "Response: $ME_RESPONSE"
  if echo $ME_RESPONSE | grep -q "email"; then
    echo " Get user successful"
  fi
else
  echo " Skip - No access token"
fi

# Test 5: Refresh Token
echo ""
echo "5️  Testing POST /auth/refresh-token"
if [ ! -z "$REFRESH_TOKEN" ]; then
  REFRESH_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/refresh-token" \
    -H "Content-Type: application/json" \
    -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}")
  echo "Response: $REFRESH_RESPONSE"
  NEW_ACCESS_TOKEN=$(echo $REFRESH_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
  if [ ! -z "$NEW_ACCESS_TOKEN" ]; then
    echo " Token refresh successful - New Access Token: ${NEW_ACCESS_TOKEN:0:20}..."
    ACCESS_TOKEN=$NEW_ACCESS_TOKEN
  fi
else
  echo " Skip - No refresh token"
fi

# Test 6: Forgot Password
echo ""
echo "6️  Testing POST /auth/forgot-password"
FORGOT_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/forgot-password" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\"}")

echo "Response: $FORGOT_RESPONSE"
RESET_TOKEN=$(echo $FORGOT_RESPONSE | grep -o '"reset":"token:[^"]*' | cut -d'"' -f4 | sed 's/token://')

if echo $FORGOT_RESPONSE | grep -q "message"; then
  echo " Forgot password request successful"
fi

# Test 7: Reset Password
echo ""
echo "7️  Testing POST /auth/reset-password"
if [ ! -z "$RESET_TOKEN" ]; then
  RESET_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/reset-password" \
    -H "Content-Type: application/json" \
    -d "{
      \"token\": \"$RESET_TOKEN\",
      \"password\": \"NewPassword456!\"
    }")
  echo "Response: $RESET_RESPONSE"
  if echo $RESET_RESPONSE | grep -q "mis à jour"; then
    echo " Password reset successful"
  fi
else
  echo "  Skip - No reset token (configure SMTP in .env)"
fi

# Test 8: Logout
echo ""
echo "8️  Testing POST /auth/logout (Protected)"
if [ ! -z "$ACCESS_TOKEN" ]; then
  LOGOUT_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/logout" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json")
  echo "Response: $LOGOUT_RESPONSE"
  if echo $LOGOUT_RESPONSE | grep -q "Déconnexion"; then
    echo " Logout successful"
  fi
else
  echo " Skip - No access token"
fi

# Test 9: Invalid Token
echo ""
echo "9️  Testing GET /auth/me with invalid token"
INVALID_RESPONSE=$(curl -s -X GET "$BASE_URL/auth/me" \
  -H "Authorization: Bearer invalid.token.here")

echo "Response: $INVALID_RESPONSE"
if echo $INVALID_RESPONSE | grep -q "non autorisé"; then
  echo " Invalid token correctly rejected"
fi

# Test 10: Rate Limiting
echo ""
echo " Testing Rate Limiting (5 failed attempts)"
for i in {1..5}; do
  RATE_TEST=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"$EMAIL\",
      \"password\": \"WrongPassword\"
    }")
  
  if echo $RATE_TEST | grep -q "Locked"; then
    echo " Account locked after failed attempts"
    echo "Response: $RATE_TEST"
    break
  elif [ $i -eq 5 ]; then
    echo " 5 failed attempts executed"
  fi
done

echo ""
echo "================================================"
echo " All tests completed!"
echo ""
echo "Summary:"
echo " Registration & Email Verification"
echo " Login & Token Generation"
echo " Protected Routes (GET /me)"
echo " Token Refresh"
echo " Password Reset Flow"
echo " Logout & Session Cleanup"
echo " Error Handling"
echo " Rate Limiting"
echo ""
echo " Notes:"
echo "- Tests use test email: $EMAIL"
echo "- For email features, configure SMTP in .env"
echo "- To run again, update EMAIL variable to avoid conflicts"
echo ""
