# BlockSeat - Ee sala ticket namdhe guru! 🎫⛓️

**A blockchain-based NFT ticketing platform** designed to eliminate black-market ticket reselling through:
- **ERC-721 NFT minting** on Polygon Amoy (testnet)
- **Capped resale pricing** - prevent scalpers
- **Yellow seats** - tickets locked to original buyer (no resale allowed)
- **OTP + 2FA authentication** - secure phone-based login
- **QR-based gate entry** - TOTP-verified ticket validation
- **Razorpay integration** - seamless payment processing

---

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** and npm
- **MongoDB** (Atlas or local)
- **Polygon Amoy RPC** endpoint (get from Alchemy/Infura)
- **Razorpay** test account keys
- **Cloudflare Turnstile** CAPTCHA keys (optional)

### Setup in 5 Minutes

#### 1. Clone & Install
```bash
git clone <repo-url>
cd BlockSeat_HashCoders
```

#### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
```

**Fill `.env` file:**
```env
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/blockseat
JWT_SECRET=your-super-secret-jwt-key
MASTER_ENCRYPTION_KEY=your-32-char-encryption-key
POLYGON_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/YOUR_KEY
CONTRACT_ADDRESS=0x...deployed_contract_address
ADMIN_PRIVATE_KEY=0x...admin_wallet_private_key
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=secret_xxx
TOTP_ISSUER=BlockSeat
PORT=5000
NODE_ENV=development
```

**Start Backend:**
```bash
npm run dev
# Backend running on http://localhost:5000
```

#### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
# App running on http://localhost:3000
```

#### 4. (Optional) Deploy Smart Contract
```bash
cd blockchain
npm install
npx hardhat run scripts/deploy.js --network amoy
# Copy deployed contract address to backend .env
```

---

## 📋 System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                  BLOCKSEAT SYSTEM                                   │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────────────┐
│                          🖥️  FRONTEND (React + Vite)                                │
├──────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐   │
│  │  Login Page    │  │  Event Browse  │  │   Checkout     │  │  My Tickets    │   │
│  │ OTP + CAPTCHA  │  │ & Seat Select  │  │  (Razorpay)    │  │  QR Display    │   │
│  └────────────────┘  └────────────────┘  └────────────────┘  └────────────────┘   │
│         │                    │                    │                    │            │
│         ├────────────────────┼────────────────────┼────────────────────┤            │
│         │                    │                    │                    │            │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐           │            │
│  │  Transfer      │  │ Gate Scanner   │  │  Verify Owner  │           │            │
│  │  Request       │  │ (TOTP Verify)  │  │  (Public)      │           │            │
│  └────────────────┘  └────────────────┘  └────────────────┘           │            │
│         │                    │                    │                    │            │
└─────────┼────────────────────┼────────────────────┼────────────────────┼────────────┘
          │                    │                    │                    │
          │               API Calls (Axios)        │                    │
          └────────────┬───────────────────────────┴────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                        🔧  BACKEND (Express.js on Port 5000)                         │
├──────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐                  │
│  │  Auth Routes     │  │  Event Routes    │  │  Ticket Routes   │                  │
│  ├──────────────────┤  ├──────────────────┤  ├──────────────────┤                  │
│  │ • send-otp       │  │ • GET events     │  │ • GET /tickets   │                  │
│  │ • verify-otp     │  │ • GET seats      │  │ • POST /mint     │                  │
│  │ • JWT issuance   │  │ • Event listing  │  │ • Get balance    │                  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘                  │
│         │                      │                      │                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐                  │
│  │ Transfer Routes  │  │  Gate Routes     │  │  Queue Routes    │                  │
│  ├──────────────────┤  ├──────────────────┤  ├──────────────────┤                  │
│  │ • Resale request │  │ • verify TOTP    │  │ • join queue     │                  │
│  │ • Market listing │  │ • Burn ticket    │  │ • queue status   │                  │
│  │ • Accept payment │  │ • QR validation  │  │ • queue pass     │                  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘                  │
│         │                      │                      │                             │
│  ┌──────────────────┐  ┌──────────────────┐                                         │
│  │  Admin Routes    │  │ Payment Routes   │                                         │
│  ├──────────────────┤  ├──────────────────┤                                         │
│  │ • create event   │  │ • create-order   │                                         │
│  │ • add seats      │  │ • verify payment │                                         │
│  └──────────────────┘  └──────────────────┘                                         │
│         │                      │                                                    │
└─────────┼──────────────────────┼────────────────────────────────────────────────────┘
          │                      │
          ├──────────┬───────────┤
          │          │           │
          ▼          ▼           ▼
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                   💾  DATA LAYER (MongoDB Atlas / Local)                             │
├──────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐         │
│  │  Users Collection   │  │  Tickets Collection │  │  Events Collection  │         │
│  ├─────────────────────┤  ├─────────────────────┤  ├─────────────────────┤         │
│  │ • phone             │  │ • tokenId           │  │ • eventId           │         │
│  │ • bstId             │  │ • ownerBstId        │  │ • name              │         │
│  │ • walletAddress     │  │ • seat              │  │ • date              │         │
│  │ • encryptedKey      │  │ • faceValue         │  │ • venue             │         │
│  │                     │  │ • maxResalePrice    │  │ • seats (array)     │         │
│  │                     │  │ • canResale ⭐      │  │ • seatType (yellow) │         │
│  │                     │  │ • qrSecret          │  │                     │         │
│  │                     │  │ • txHash            │  │                     │         │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────────┘         │
│                                                                                      │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐                  │
│  │ TransferRequests Collection │  │  ResaleListings Collection  │                  │
│  ├─────────────────────────────┤  ├─────────────────────────────┤                  │
│  │ • tokenId                   │  │ • tokenId                   │                  │
│  │ • sellerBstId               │  │ • sellerBstId               │                  │
│  │ • buyerBstId                │  │ • resalePrice               │                  │
│  │ • resalePrice               │  │ • eventId                   │                  │
│  │ • status (pending/complete) │  │ • status (listed/sold)      │                  │
│  └─────────────────────────────┘  └─────────────────────────────┘                  │
│                                                                                      │
└──────────────────────────────────────────────────────────────────────────────────────┘
          │
          │  [Indexed Queries, Atomic Updates]
          │
          ▼
┌──────────────────────────────────────────────────────────────────────────────────────┐
│              ⛓️  BLOCKCHAIN LAYER (Polygon Amoy Testnet)                             │
├──────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌────────────────────────────────────────────────────────────────────────────┐    │
│  │         Smart Contract: BlockSeatTicket.sol (ERC-721)                      │    │
│  ├────────────────────────────────────────────────────────────────────────────┤    │
│  │                                                                            │    │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐         │    │
│  │  │  Mint Function   │  │ Transfer Function│  │  Burn Function   │         │    │
│  │  ├──────────────────┤  ├──────────────────┤  ├──────────────────┤         │    │
│  │  │ • Create NFT     │  │ • Transfer owner │  │ • Mark as used   │         │    │
│  │  │ • Store metadata │  │ • Update ledger  │  │ • Prevent reuse  │         │    │
│  │  │ • RPC via admin  │  │ • On-chain sig   │  │ • Gas: ~50K wei  │         │    │
│  │  │ • Gas: ~200K wei │  │ • Gas: ~80K wei  │  │                  │         │    │
│  │  └──────────────────┘  └──────────────────┘  └──────────────────┘         │    │
│  │                                                                            │    │
│  │  ┌──────────────────────────────────────────────────────────────┐         │    │
│  │  │  View Functions:                                             │         │    │
│  │  │  • ownerOf(tokenId) → get current owner address             │         │    │
│  │  │  • getTicketData(tokenId) → fetch on-chain metadata          │         │    │
│  │  └──────────────────────────────────────────────────────────────┘         │    │
│  │                                                                            │    │
│  └────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                      │
│  Network: Polygon Amoy (Testnet)                                                   │
│  RPC Endpoint: https://polygon-amoy.g.alchemy.com/v2/{YOUR_KEY}                   │
│  Gas Token: POL (free on testnet)                                                  │
│                                                                                      │
└──────────────────────────────────────────────────────────────────────────────────────┘
          ▲
          │  [Ethers.js Calls via Admin Signer]
          │
          ├─────────────────────────────────────────────────────────┐
          │                                                           │
    ┌─────────────────────────────────────────────────────────────────────────┐
    │              🌍  EXTERNAL SERVICES & INTEGRATIONS                       │
    ├─────────────────────────────────────────────────────────────────────────┤
    │                                                                         │
    │  ┌──────────────────────────────┐  ┌──────────────────────────────┐    │
    │  │     Razorpay SDK             │  │  Cloudflare Turnstile        │    │
    │  ├──────────────────────────────┤  ├──────────────────────────────┤    │
    │  │ • Payment Processing         │  │ • CAPTCHA Verification       │    │
    │  │ • Order Creation             │  │ • Bot Prevention             │    │
    │  │ • Webhook: Payment Success   │  │ • Frontend + Backend         │    │
    │  │ • Refund Handling            │  │   Validation                 │    │
    │  └──────────────────────────────┘  └──────────────────────────────┘    │
    │                                                                         │
    └─────────────────────────────────────────────────────────────────────────┘


DATA FLOW SUMMARY:
═════════════════════════════════════════════════════════════════════════════════════

1. USER BOOKING FLOW:
   Frontend (Login) → OTP Verify → JWT Token → Browse Events → Select Seats
        ↓
   Queue Pass → Payment Order (Razorpay) → Razorpay Callback
        ↓
   Backend: Mint Ticket → ERC-721 Contract Call → Blockchain TX
        ↓
   Store in MongoDB → Update Seat in Events → Return to My Tickets

2. TRANSFER FLOW:
   Frontend (Transfer Request) → Backend: Create TransferRequest
        ↓
   Buyer Accepts → Payment Order → Razorpay Callback
        ↓
   Backend: Update Ticket Owner → ERC-721 Transfer → Rotate QR Secret
        ↓
   Update MongoDB → Notify both parties

3. GATE ENTRY FLOW:
   Frontend (QR Code) → Scanner reads QR + TOTP
        ↓
   Backend: Verify TOTP → Check On-chain Owner → Burn Ticket
        ↓
   Blockchain: Mark as Used → Frontend: Entry Granted/Denied

4. YELLOW SEAT FLOW:
   Frontend: Click Yellow Seat → Warning Modal
        ↓
   User Confirms → Add to Cart → Normal Checkout
        ↓
   Backend: Set canResale=false → Store in DB + Blockchain
        ↓
   Transfer Page: Block Resale Option (canResale=false check)
```

---

## 🏗️ Monorepo Structure

```
BlockSeat_HashCoders/
├── frontend/                 # React + Vite frontend
│   ├── src/
│   │   ├── pages/           # Login, Events, Tickets, Transfer, Gate Scanner
│   │   ├── components/      # SeatGrid, NavBar, ErrorBoundary
│   │   ├── services/        # API client, Queue Pass service
│   │   └── styles.css       # Dark theme luxury styling
│   └── vite.config.js
│
├── backend/                  # Express API server
│   ├── routes/              # Auth, Events, Tickets, Transfer, Gate, Admin
│   ├── models/              # User, Ticket, Event, TransferRequest, ResaleListing
│   ├── middleware/          # JWT Auth, Rate Limiter, Queue Pass, Validation
│   ├── config/              # DB, Blockchain, Logger, Captcha, Env Validation
│   ├── schemas/             # Joi validation schemas
│   ├── utils/               # Wallet Manager, TOTP Helper, TX Retry, txRetry
│   ├── tests/               # Jest unit & integration tests
│   └── server.js
│
└── blockchain/              # Solidity smart contract
    ├── contracts/
    │   └── BlockSeatTicket.sol
    ├── scripts/
    │   └── deploy.js
    └── hardhat.config.js
```

---

## 🎯 Core Features

### 1. **Phone-Based Authentication**
- OTP sent via SMS/console (demo)
- User creation with wallet keypair (encrypted on DB)
- JWT token valid for 7 days
- Rate limited to prevent brute force

### 2. **Event Management**
- **Create Events** (Admin only)
- **Dynamic Seat Pricing** by section/row
- **Seat Types**: Normal (transferable) vs Yellow (locked to buyer)
- **Seat Status**: Available, Taken, Market Listed

### 3. **Booking & Checkout**
- **Queue-based waiting room** to prevent checkout crushing
- **Max 4 active tickets** per user wallet
- **Atomic seat claiming** - prevents double bookings
- **Razorpay payments** with order tracking
- **On-chain minting** after payment succeeds

### 4. **Yellow Seat (No-Resale) Feature** ⭐
- Mark seats as "yellow" - buyers cannot resale
- Warning modal shown before purchase
- `canResale: false` flag stored in ticket
- Transfer page blocks resale with error message

### 5. **Capped Resale**
- `maxResalePrice = faceValue × 1.1` (10% cap)
- Transfer request flow between buyers/sellers
- Transfer requests blocked if one is pending
- QR secret rotates after transfer

### 6. **QR-Based Gate Validation**
- TOTP code embedded in QR + encrypted payload
- Stateless verification (no backend DB check required)
- Prevents duplicate QR scans
- Burn ticket on entry (marks as used on-chain)

### 7. **Marketplace Resale Listings**
- Sellers list available tickets
- Buyers can buy from marketplace
- Same capped pricing rules apply
- Public listing visibility

---

## 🔌 API Endpoints

### Authentication
```
POST   /auth/send-otp              # Send OTP to phone
POST   /auth/verify-otp            # Verify OTP, get JWT + bstId
```

### Events
```
GET    /events                      # List all events with seat counts
GET    /events/:id/seats            # Get detailed seat map for event
```

### Tickets (Auth Required)
```
GET    /tickets                     # Get user's tickets
POST   /tickets/mint                # Mint new ticket (after payment)
GET    /tickets/public/:tokenId/owner  # Public lookup - who owns ticket?
```

### Transfer & Resale (Auth Required)
```
POST   /transfer/request            # Create transfer request
GET    /transfer/requests/incoming  # Received transfer requests
GET    /transfer/requests/sent      # Sent transfer requests
POST   /transfer/request/:id/accept-order # Accept & create payment order
POST   /transfer/request/:id/complete    # Complete transfer after payment

GET    /market/listings/event/:eventId   # See resale listings
POST   /market/listing               # List ticket for resale
GET    /market/listings/my           # My active listings
POST   /market/listing/:id/create-order  # Buy from marketplace
POST   /market/listing/:id/complete      # Complete marketplace purchase
```

### Gate Verification (Public)
```
POST   /gate/verify                 # Verify QR + TOTP before entry
POST   /gate/burn                   # Mark ticket as used (burn on-chain)
```

### Admin (Admin Auth Required)
```
POST   /admin/login                 # Admin login
POST   /admin/matches               # Create new event
```

### Queue Management
```
POST   /queue/join                  # Get queue pass for checkout
GET    /queue/status                # Check queue position
```

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|-----------|---------|
| **React 18** | UI component framework |
| **Vite 5** | Build tool & dev server |
| **React Router 6** | Client-side routing |
| **Axios** | HTTP client |
| **Razorpay SDK** | Payment gateway UI |
| **CSS3** | Dark theme luxury styling |

### Backend
| Technology | Purpose |
|-----------|---------|
| **Express.js** | REST API server |
| **Node.js 18+** | JavaScript runtime |
| **MongoDB** | NoSQL database |
| **Mongoose** | MongoDB ODM |
| **Ethers.js** | Blockchain interaction |
| **JWT** | Token-based auth |
| **Razorpay** | Payment processing |
| **Joi** | Schema validation |
| **Jest** | Unit & integration testing |
| **bcryptjs** | Password hashing |

### Blockchain
| Technology | Purpose |
|-----------|---------|
| **Solidity** | Smart contract language |
| **Hardhat** | Development framework |
| **OpenZeppelin** | ERC-721 standard |
| **Polygon Amoy** | Testnet (gas-free) |

### Key Libraries
| Package | Version | Use |
|---------|---------|-----|
| `ethers.js` | 6.x | Web3 contract interaction |
| `speakeasy` | - | TOTP generation/validation |
| `jsonwebtoken` | - | JWT signing/verification |
| `razorpay` | - | Payment gateway API |

---

## 📊 Data Models

### User
```javascript
{
  phone: String (unique, index),
  bstId: String (unique, generated),
  walletAddress: String (Ethereum address),
  encryptedPrivateKey: String (AES encrypted)
}
```

### Ticket
```javascript
{
  tokenId: Number (unique, on-chain reference),
  eventId: String,
  seat: String,
  ownerBstId: String,
  ownerWalletAddress: String,
  faceValue: Number (in INR),
  maxResalePrice: Number,
  isUsed: Boolean,
  transferCount: Number,
  canResale: Boolean,  // false for yellow seats
  qrSecret: String (for TOTP),
  txHash: String (blockchain TX hash)
}
```

### Event
```javascript
{
  eventId: String (unique),
  name: String,
  date: Date,
  venue: String,
  totalSeats: Number,
  seats: [{
    seatId: String,
    row: String,
    stand: String,
    price: Number,
    isTaken: Boolean,
    seatType: String  // "normal" or "yellow"
  }]
}
```

### TransferRequest
```javascript
{
  tokenId: Number,
  sellerBstId: String,
  buyerBstId: String,
  resalePrice: Number,
  status: String  // "pending", "accepted", "declined"
}
```

---

## 🔄 End-to-End User Flows

### Flow 1: Login → Browse → Book → Pay → Mint
1. User opens `/login` page
2. Enters phone number + solves CAPTCHA
3. Backend sends OTP (console demo)
4. User enters OTP
5. Backend creates wallet keypair, stores encrypted key
6. User gets JWT token + BST ID
7. Redirected to `/events` (event listing)
8. User selects event → sees available/taken/yellow seats
9. Clicks yellow seat → warning modal shown
10. User confirms understanding → seat added to selection
11. Clicks "Book" → joins checkout queue
12. Razorpay checkout modal opens
13. Payment succeeds
14. Backend mints ticket ERC-721 on Polygon with `canResale=false`
15. Ticket stored in MongoDB
16. User redirected to `/my-tickets`

### Flow 2: Transfer Normal (Transferable) Ticket
1. User navigates to `/transfer/:tokenId`
2. Enters recipient BST ID
3. Clicks "Lookup Buyer"
4. Backend verifies buyer exists (returns name)
5. User enters resale price (capped at `maxResalePrice`)
6. Clicks "Send Transfer Request"
7. TransferRequest created with status `pending`
8. Receiver sees request in `/my-tickets`
9. Receiver clicks "Accept & Buy"
10. Payment order created (for resale amount)
11. Razorpay checkout opens
12. Payment succeeds
13. Backend transfers NFT ownership on blockchain
14. QR secret rotates (invalidates old owner's QR)
15. New owner sees ticket in wallet

### Flow 3: Gate Entry with QR Verification
1. User opens `/qr/:tokenId` page
2. Displays dynamic QR code (TOTP-based)
3. Gate attendant scans QR
4. System extracts tokenId + TOTP code
5. Backend verifies TOTP against stored `qrSecret`
6. Checks ticket not already used
7. Confirms on-chain ownership
8. Returns `VALID` status
9. Attendant clicks "Confirm Entry"
10. Backend burns ticket (`isUsed=true`)
11. On-chain, ticket marked as used
12. QR no longer works (stateless check prevents re-entry)

### Flow 4: Attempt to Resale Yellow Seat Ticket (Blocked)
1. User has yellow seat ticket (with `canResale=false`)
2. Navigates to `/transfer/:tokenId`
3. Page detects `canResale=false`
4. Shows error: "❌ This ticket is restricted from resale"
5. Transfer form hidden
6. User cannot proceed

---

## 🧪 Testing

### Run Backend Tests
```bash
cd backend
npm test

# Run specific test file
npm test -- auth.test.js
```

### Admin Test Credentials
```
User: admin
Password: admin@123
```

### Test Flow
1. Login with phone `9876543210` (any 10 digits)
2. OTP printed to console
3. Verify with that OTP
4. Get access to events & booking

---

## 🔐 Security Features

- **Encrypted Private Keys** - AES-256 encryption for wallet keys
- **Rate Limiting** - Auth endpoints limited to 5 requests/min
- **JWT Expiry** - 7-day token expiry
- **TOTP Validation** - Time-based OTP prevents QR reuse
- **Atomic Transactions** - MongoDB transactions ensure consistency
- **Validation Schemas** - Joi validation on all inputs
- **CORS Enabled** - Configured for frontend URLs only

---

## 📝 Environment Variables

See [`.env.example`](backend/.env.example) for all required variables:

```env
# Database
MONGO_URI                  # MongoDB connection string

# JWT & Encryption
JWT_SECRET                 # Secret for token signing (min 32 chars)
MASTER_ENCRYPTION_KEY      # Key for wallet encryption (32 chars)

# Blockchain
POLYGON_RPC_URL            # Alchemy/Infura RPC endpoint
CONTRACT_ADDRESS           # Deployed ERC-721 contract address
ADMIN_PRIVATE_KEY          # Admin wallet private key (for minting)

# Payment
RAZORPAY_KEY_ID            # Razorpay API key
RAZORPAY_KEY_SECRET        # Razorpay secret

# CAPTCHA (Optional)
CAPTCHA_SECRET_KEY         # Cloudflare Turnstile secret

# Server
PORT                       # Server port (default: 5000)
NODE_ENV                   # development or production
```

---

## 📚 Project Structure Explained

### `/routes` - API Endpoints
- `auth.js` - OTP generation, verification, JWT issuance
- `events.js` - Event listing, seat maps
- `tickets.js` - Mint, retrieve, public lookup
- `transfer.js` - Transfer requests, marketplace, resale payments
- `gate.js` - QR validation, ticket burning
- `admin.js` - Event creation (admin only)
- `queue.js` - Queue pass for checkout management

### `/models` - Database Schemas
- `User.js` - Wallet keypair, phone, BST ID
- `Ticket.js` - NFT metadata (on + off-chain)
- `Event.js` - Seat inventory
- `TransferRequest.js` - Pending/completed transfers
- `ResaleListing.js` - Marketplace listings

### `/middleware` - Request Processing
- `authMiddleware.js` - JWT verification
- `validate.js` - Joi schema validation
- `rateLimiter.js` - Rate limiting per endpoint
- `queuePass.js` - Checkout queue validation

### `/utils` - Helper Functions
- `walletManager.js` - Create/encrypt wallet keys
- `totpHelper.js` - TOTP generation & verification
- `txRetry.js` - Retry logic for blockchain TXs

---

## 🚀 Deployment Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use production MongoDB (Atlas)
- [ ] Use Polygon mainnet RPC (not testnet)
- [ ] Deploy smart contract to mainnet
- [ ] Set strong `JWT_SECRET` & `MASTER_ENCRYPTION_KEY`
- [ ] Enable HTTPS on frontend
- [ ] Configure CORS for production domain
- [ ] Set Razorpay to production mode
- [ ] Enable rate limiting on all endpoints
- [ ] Setup monitoring/logging
- [ ] Database backups configured

---

## 🐛 Troubleshooting

### Backend won't connect to MongoDB
```
❌ Error: MongooseError
✅ Solution: Check MONGO_URI in .env, ensure cluster IP whitelisted
```

### Contract not minting tickets
```
❌ Error: Contract call reverted
✅ Solution: Verify CONTRACT_ADDRESS & ADMIN_PRIVATE_KEY, check balance
```

### QR code not scanning
```
❌ Error: TOTP verification failed
✅ Solution: Ensure server time synced, qrSecret not corrupted
```

### Razorpay payment failing
```
❌ Error: Invalid key_id
✅ Solution: Use test keys for development, check .env
```

---

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repo
2. Create feature branch (`git checkout -b feature/your-feature`)
3. Commit changes (`git commit -m "Add feature"`)
4. Push to branch (`git push origin feature/your-feature`)
5. Create Pull Request

---

## 📄 License

MIT License - See LICENSE file for details

---

## 👨‍💻 Built by

**FantomCode-2026 HashCoders** - BlockSeat Team

**Questions?** Open an issue on GitHub
   - `npm run dev`

Backend runs at `http://localhost:5000`.

## Frontend Setup

1. Go to frontend:
   - `cd frontend`
2. Install dependencies:
   - `npm install`
3. Start frontend:
   - `npm run dev`

Frontend runs at `http://localhost:3000` or the Vite default port.

## Required MongoDB Seed

Create one event document in `events` with this data:

```json
{
  "eventId": "Match-001",
  "name": "RCB vs CSK",
  "date": "2026-04-09T00:00:00.000Z",
  "venue": "M. Chinnaswamy Stadium, Bangalore",
  "totalSeats": 24,
  "seats": [
    { "seatId": "A1", "row": "A", "stand": "North", "price": 1500, "isTaken": false },
    { "seatId": "A2", "row": "A", "stand": "North", "price": 1500, "isTaken": false },
    { "seatId": "A3", "row": "A", "stand": "North", "price": 1500, "isTaken": false },
    { "seatId": "A4", "row": "A", "stand": "North", "price": 1500, "isTaken": false },
    { "seatId": "A5", "row": "A", "stand": "North", "price": 1500, "isTaken": false },
    { "seatId": "A6", "row": "A", "stand": "North", "price": 1500, "isTaken": false },
    { "seatId": "B1", "row": "B", "stand": "East", "price": 4000, "isTaken": false },
    { "seatId": "B2", "row": "B", "stand": "East", "price": 4000, "isTaken": false },
    { "seatId": "B3", "row": "B", "stand": "East", "price": 4000, "isTaken": false },
    { "seatId": "B4", "row": "B", "stand": "East", "price": 4000, "isTaken": false },
    { "seatId": "B5", "row": "B", "stand": "East", "price": 4000, "isTaken": false },
    { "seatId": "B6", "row": "B", "stand": "East", "price": 4000, "isTaken": false },
    { "seatId": "C1", "row": "C", "stand": "West", "price": 4000, "isTaken": false },
    { "seatId": "C2", "row": "C", "stand": "West", "price": 4000, "isTaken": false },
    { "seatId": "C3", "row": "C", "stand": "West", "price": 4000, "isTaken": false },
    { "seatId": "C4", "row": "C", "stand": "West", "price": 4000, "isTaken": false },
    { "seatId": "C5", "row": "C", "stand": "West", "price": 4000, "isTaken": false },
    { "seatId": "C6", "row": "C", "stand": "West", "price": 4000, "isTaken": false },
    { "seatId": "D1", "row": "D", "stand": "South", "price": 7000, "isTaken": false },
    { "seatId": "D2", "row": "D", "stand": "South", "price": 7000, "isTaken": false },
    { "seatId": "D3", "row": "D", "stand": "South", "price": 7000, "isTaken": false },
    { "seatId": "D4", "row": "D", "stand": "South", "price": 7000, "isTaken": false },
    { "seatId": "D5", "row": "D", "stand": "South", "price": 7000, "isTaken": false },
    { "seatId": "D6", "row": "D", "stand": "South", "price": 7000, "isTaken": false }
  ]
}
```

## End-to-End Flow

### 1) Login

- Open `/login`
- Enter phone number
- Click **Send OTP**
- Read the OTP from the backend console
- Verify OTP
- You are redirected to `/events/Match-001`

### 2) Book Ticket

- Select an available seat
- Click **Book Now**
- Complete Razorpay checkout
- The ticket is minted on-chain and stored in MongoDB

### 3) View QR

- Open **My Tickets**
- Click **View QR**
- The QR payload is tied to the ticket record and rotates automatically
- After transfer, the QR secret rotates so the old owner’s QR no longer works

### 4) Transfer Ticket

- Open **Transfer**
- Enter the interested buyer’s BST ID
- Send a transfer request
- The buyer sees the request in **My Tickets**
- The buyer can **Accept & Buy** or **Decline**
- A second transfer request for the same ticket is blocked until the current one is resolved

### 5) Verify Ticket

- In **My Tickets**, click **Verify Ticket**
- The app opens a page prefilled with the ticket’s `txHash` from MongoDB
- You can open the Polygon Amoy explorer with that hash

### 6) Gate Scan

- Open `/gate-scanner` manually
- This is a gate/admin utility page, not shown in the customer nav
- Paste a QR image URL or upload a QR image
- Decode the QR, then verify the ticket
- A valid scan burns the ticket on entry and marks it used

## Notes

- `mint()` and `burnOnEntry()` are admin-only and run through the backend signer.
- `resell()` enforces the resale cap and transfer window.
- Each ticket now has a per-ticket QR secret stored in MongoDB.
- On successful transfer, the backend updates:
  - ticket ownership
  - transfer count
  - ticket `txHash`
  - QR secret
- Custodial user keys are AES-encrypted before storage in MongoDB.

## Local Environment Files

- [`backend/.env.example`](backend/.env.example)
- [`blockchain/.env.example`](blockchain/.env.example)
