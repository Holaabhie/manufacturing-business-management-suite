# IND Manager Authentication System Setup Guide

## Overview

This document provides step-by-step instructions to set up the complete authentication system for your IND Manager application, including Google/Microsoft SSO, WhatsApp OTP, and traditional email/password authentication.

## Prerequisites

- Node.js 18+ installed
- MongoDB database (local or cloud)
- Twilio account for WhatsApp/SMS
- Google Cloud Platform account
- Microsoft Azure account

## 1. Environment Variables Setup

Update your `.env.local` file with the following variables:

```env
# Database Configuration
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=ind_manager

# Stripe Configuration (existing)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PRO_PRICE_ID=your_stripe_price_id

# Authentication Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_random_secret_key_here_min_32_chars

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Microsoft OAuth Configuration  
AZURE_AD_CLIENT_ID=your_azure_ad_client_id
AZURE_AD_CLIENT_SECRET=your_azure_ad_client_secret
AZURE_AD_TENANT_ID=your_azure_ad_tenant_id

# Twilio Configuration for WhatsApp/SMS OTP
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_VERIFY_SERVICE_SID=your_twilio_verify_service_sid
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# Application Configuration
NEXT_PUBLIC_APP_NAME=IND Manager
NEXT_PUBLIC_SUPPORT_EMAIL=support@indmanager.com
```

## 2. Google OAuth Setup

### Step 1: Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google+ API

### Step 2: Configure OAuth Consent Screen
1. Navigate to "APIs & Services" → "OAuth consent screen"
2. Select "External" user type
3. Fill in required information:
   - App name: IND Manager
   - User support email: your@email.com
   - Developer contact: your@email.com
4. Add authorized domains
5. Save and continue

### Step 3: Create OAuth Client ID
1. Go to "Credentials" → "Create Credentials" → "OAuth client ID"
2. Application type: Web application
3. Name: IND Manager
4. Authorized redirect URIs:
   ```
   http://localhost:3000/api/auth/callback/google
   https://yourdomain.com/api/auth/callback/google
   ```
5. Copy the Client ID and Client Secret to your `.env.local`

## 3. Microsoft Azure AD Setup

### Step 1: Register Application
1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to "Azure Active Directory" → "App registrations"
3. Click "New registration"
4. Fill in:
   - Name: IND Manager
   - Supported account types: Accounts in any organizational directory
   - Redirect URI: Web → `http://localhost:3000/api/auth/callback/microsoft-entra-id`

### Step 2: Configure Authentication
1. In your app registration, go to "Authentication"
2. Add redirect URIs:
   ```
   http://localhost:3000/api/auth/callback/microsoft-entra-id
   https://yourdomain.com/api/auth/callback/microsoft-entra-id
   ```
3. Enable "ID tokens" under Implicit grant and hybrid flows

### Step 3: Get Credentials
1. Go to "Overview" and copy:
   - Application (client) ID → `AZURE_AD_CLIENT_ID`
   - Directory (tenant) ID → `AZURE_AD_TENANT_ID`
2. Go to "Certificates & secrets" → "New client secret"
3. Copy the secret value → `AZURE_AD_CLIENT_SECRET`

## 4. Twilio Setup for WhatsApp/SMS OTP

### Step 1: Create Twilio Account
1. Sign up at [Twilio](https://www.twilio.com/)
2. Verify your account and phone number

### Step 2: Get Account Credentials
1. Go to [Console Dashboard](https://console.twilio.com/)
2. Copy:
   - Account SID → `TWILIO_ACCOUNT_SID`
   - Auth Token → `TWILIO_AUTH_TOKEN`

### Step 3: Set up Verify Service
1. Go to "Verify" → "Services"
2. Create new service:
   - Friendly name: IND Manager OTP
   - Choose "skip" for WhatsApp template (Twilio handles this automatically)
3. Copy Service SID → `TWILIO_VERIFY_SERVICE_SID`

### Step 4: WhatsApp Business Setup (Optional)
1. Go to "WhatsApp" → "Senders"
2. Follow Twilio's WhatsApp sandbox setup
3. Note: For production, you'll need WhatsApp Business API approval

### Step 5: Get Phone Number
1. Go to "Phone Numbers" → "Manage" → "Active numbers"
2. Buy a phone number or use existing one
3. Copy the number → `TWILIO_PHONE_NUMBER`

## 5. MongoDB Setup

### Local MongoDB
1. Install MongoDB locally or use MongoDB Atlas
2. Ensure MongoDB is running on `mongodb://localhost:27017`
3. Database name: `ind_manager`

### MongoDB Atlas (Cloud)
1. Sign up at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create cluster and database user
3. Get connection string and update `MONGODB_URI`

## 6. NextAuth.js Configuration

The system uses NextAuth.js v5 (Auth.js) with:
- MongoDB adapter for user/session storage
- JWT strategy for sessions
- Custom callbacks for user account linking

## 7. Database Models

### User Model Structure
```javascript
{
  email: String (optional, unique when provided),
  phone: String (required, unique),
  password: String (hashed, optional for OAuth users),
  googleId: String (unique),
  microsoftId: String (unique),
  fullName: String,
  role: "Admin" | "Staff",
  subscription_tier: "starter" | "pro",
  isEmailVerified: Boolean,
  isPhoneVerified: Boolean,
  company_details: Object,
  createdAt: Date,
  updatedAt: Date
}
```

### OTP Model Structure
```javascript
{
  phone: String,
  hashedOtp: String,
  attempts: Number,
  expiresAt: Date,
  purpose: "login" | "forgot-password",
  createdAt: Date
}
```

## 8. API Endpoints

### Authentication Routes
- `POST /api/auth/send-otp` - Send OTP to phone
- `POST /api/auth/verify-otp` - Verify OTP and login
- `POST /api/auth/forgot-password` - Initiate password reset
- `POST /api/auth/reset-password` - Reset password after OTP verification

### OAuth Routes (handled by NextAuth)
- `/api/auth/signin/google` - Google OAuth
- `/api/auth/signin/microsoft-entra-id` - Microsoft OAuth
- `/api/auth/callback/*` - OAuth callbacks

## 9. Frontend Components

### Login Page Features
- Tabbed interface: Email/Password, Phone OTP, SSO
- Auto-formatting for Indian phone numbers (+91)
- OTP input with auto-focus
- Loading states and error handling
- Forgot password modal flow
- Responsive design

## 10. Security Features

### Rate Limiting
- 5 requests per IP per hour for OTP sending
- 3 OTP verification attempts before lockout
- OTP expiration after 5 minutes

### Data Protection
- Passwords hashed with bcrypt (10 rounds)
- OTPs hashed before storage
- Secure session cookies with HttpOnly flag
- Environment variables for all secrets

### Phone Validation
- Uses libphonenumber-js for Indian number validation
- Auto-formats to E.164 standard (+91xxxxxxxxxx)

## 11. Testing the Setup

### Test Email/Password Flow
1. Visit `/login`
2. Select "Email" tab
3. Register new account or login with existing credentials

### Test Phone OTP Flow
1. Select "Phone" tab
2. Enter valid Indian phone number
3. Click "Send OTP"
4. Enter received OTP to login

### Test OAuth Flow
1. Select "SSO" tab
2. Click "Continue with Google" or "Continue with Microsoft"
3. Complete OAuth flow
4. User should be redirected to dashboard

### Test Forgot Password
1. Click "Forgot Password?" link
2. Enter phone number
3. Receive and verify OTP
4. Set new password

## 12. Production Deployment

### Environment Variables
Update for production:
```env
NEXTAUTH_URL=https://yourdomain.com
NODE_ENV=production
```

### Additional Considerations
- Use HTTPS in production
- Set up proper DNS records
- Configure production MongoDB connection
- Review and customize OAuth consent screens
- Set up monitoring for authentication failures
- Regular security audits

## 13. Troubleshooting

### Common Issues

**OAuth Callback Errors:**
- Verify redirect URIs match exactly
- Check client IDs and secrets
- Ensure APIs are enabled in respective consoles

**OTP Delivery Failures:**
- Verify Twilio credentials
- Check phone number formatting
- Review Twilio account limits and balances

**Database Connection Issues:**
- Verify MongoDB URI and credentials
- Check database connectivity
- Ensure proper indexes are created

**Session Issues:**
- Check NEXTAUTH_SECRET is set and secure
- Verify cookie settings in production
- Clear browser cookies if experiencing issues

## 14. Maintenance

### Regular Tasks
- Monitor authentication logs
- Rotate secrets periodically
- Update dependencies regularly
- Review rate limiting effectiveness
- Clean up expired OTP records

### Backup Considerations
- Regular database backups
- Export user data for compliance
- Document recovery procedures

---

**Need Help?**
Contact: support@indmanager.com
Documentation: https://docs.indmanager.com