# Real-Time OTP to Phone Number - Setup Guide

## Overview
The BlockSeat backend now has a **production-ready real-time OTP authentication system** using Twilio SMS. OTPs are stored in MongoDB with automatic expiration and attempt tracking.

## Features
✅ Real SMS delivery via Twilio  
✅ 6-digit OTP with 5-minute expiration  
✅ Persistent MongoDB storage (auto-deletes expired OTPs)  
✅ Rate limiting (5 failed attempts max per OTP)  
✅ OTP resend capability with CAPTCHA protection  
✅ Detailed error messages with attempt tracking  
✅ Mock SMS fallback for development (logs to console)  
✅ Secure OTP hashing with bcryptjs  

## Setup Instructions

### Step 1: Get Twilio Credentials
1. Sign up at [twilio.com](https://www.twilio.com)
2. Go to **Console Dashboard**
3. Copy your:
   - **Account SID** (starts with `AC`)
   - **Auth Token**
   - **Phone Number** (your Twilio number, e.g., `+1234567890`)

### Step 2: Configure Environment Variables
Add to your `.env` file:

```env
# Twilio SMS Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

If these are not set, OTPs will be logged to console (development mode).

### Step 3: Database Setup
The OTP model is automatically created in MongoDB. Ensure `MONGO_URI` is configured.

### Step 4: Frontend Integration

#### Send OTP
```javascript
const response = await fetch('/auth/send-otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    phone: '9876543210',  // 10-digit Indian phone number
    captchaToken: 'your-captcha-token'
  })
});
```

#### Verify OTP
```javascript
const response = await fetch('/auth/verify-otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    phone: '9876543210',
    otp: '123456'
  })
});
```

#### Resend OTP
```javascript
const response = await fetch('/auth/resend-otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    phone: '9876543210',
    captchaToken: 'your-captcha-token'
  })
});
```

## API Endpoints

### POST `/auth/send-otp`
Sends a 6-digit OTP to the provided phone number.

**Request:**
```json
{
  "phone": "9876543210",
  "captchaToken": "string"
}
```

**Response (Success):**
```json
{
  "message": "OTP sent successfully to your phone",
  "phoneHint": "+9198****210"
}
```

### POST `/auth/verify-otp`
Verifies the OTP and returns JWT token.

**Request:**
```json
{
  "phone": "9876543210",
  "otp": "123456"
}
```

**Response (Success):**
```json
{
  "message": "OTP verified successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "bstId": "BST-2024-00001",
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f42cA5",
  "isNewUser": true
}
```

### POST `/auth/resend-otp`
Resends OTP to the phone number.

**Request:**
```json
{
  "phone": "9876543210",
  "captchaToken": "string"
}
```

**Response (Success):**
```json
{
  "message": "OTP resent successfully to your phone",
  "phoneHint": "+9198****210"
}
```

## Error Handling

| Status | Message | Action |
|--------|---------|--------|
| 400 | "OTP expired or not found" | Request new OTP |
| 400 | "Invalid OTP. X attempts remaining." | Retry with correct OTP |
| 429 | "Too many failed attempts. Please request a new OTP." | Wait and request new OTP |
| 400 | "CAPTCHA verification failed" | Complete CAPTCHA again |

## Development Mode
Without Twilio credentials, OTPs are **logged to console**:
```
[DEBUG] [MOCK SMS] OTP for 9876543210: 123456
```

**Dev bypass OTP:** `111111` (works only in development)

## Database Structure

### OTP Collection
```javascript
{
  _id: ObjectId,
  phone: "9876543210",
  otpHash: "bcrypt_hash_here",
  expiresAt: ISODate("2024-04-14T12:35:00Z"),
  attempts: 0,
  lastAttemptAt: null,
  messageSid: "SM1234567890abcdef",  // Twilio message ID
  isMock: false,
  createdAt: ISODate("2024-04-14T12:30:00Z")
}
```

Expired records are **automatically deleted** by MongoDB via TTL index.

## Security Features
✅ **Rate Limiting**: 5 OTP requests per 15 minutes per user  
✅ **OTP Hashing**: bcryptjs with salt rounds = 10  
✅ **Attempt Tracking**: Max 5 wrong attempts per OTP  
✅ **CAPTCHA Protection**: Required for send/resend  
✅ **Automatic Expiration**: 5 minutes TTL  
✅ **Auto-Delete**: Expired OTPs removed from DB  

## Monitoring
Check logs for:
- `OTP sent successfully to {phone}` - Success
- `Failed to send OTP SMS to {phone}` - SMS failure
- `User logged in: {bstId}` - Successful verification
- `New user created: {bstId}` - New user registered

## Troubleshooting

### OTPs not being sent
- ✅ Verify Twilio credentials in `.env`
- ✅ Check Twilio account has sufficient balance
- ✅ Ensure phone number format is correct: `+91XXXXXXXXXX`

### "CAPTCHA verification failed"
- ✅ Ensure `CAPTCHA_ENABLED=true` and valid `TURNSTILE_SECRET_KEY`

### OTP expired
- ✅ OTP valid for 5 minutes, request new if needed

### Too many attempts
- ✅ Maximum 5 wrong attempts allowed, request new OTP to reset
