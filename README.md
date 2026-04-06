# BlockSeat

BlockSeat is a blockchain-based NFT ticketing platform designed to reduce black-market reselling.  
It uses ERC-721 tickets on Polygon Amoy, Node/Express backend APIs, and a React frontend with OTP login, Razorpay payments, capped ticket resale, and dynamic QR gate validation.

## Monorepo Structure

- `blockchain/` - Solidity contract and Hardhat config
- `backend/` - Express APIs, MongoDB models, blockchain + payment integrations
- `frontend/` - React app with booking, transfer, QR display, and gate scanner demo

## 1) Prerequisites

- Node.js 18+
- MongoDB Atlas database
- Polygon Amoy RPC provider (Alchemy/Infura/etc.)
- Razorpay test account keys

## 2) Deploy Contract on Remix (Polygon Amoy)

1. Open [Remix IDE](https://remix.ethereum.org/).
2. Create `BlockSeatTicket.sol` using code from `blockchain/contracts/BlockSeatTicket.sol`.
3. In **Solidity Compiler**, compile with version `0.8.20` (or compatible `0.8.x`).
4. In **Deploy & Run Transactions**:
   - Environment: **Injected Provider - MetaMask**
   - Connect MetaMask to **Polygon Amoy Testnet**
5. Deploy `BlockSeatTicket`.
6. Copy deployed contract address and put it into backend `.env` as `CONTRACT_ADDRESS`.
7. Use the same deploying private key as `ADMIN_PRIVATE_KEY` in backend `.env`.

## 3) Backend Setup

1. Go to backend folder:
   - `cd blockseat/backend`
2. Install dependencies:
   - `npm install`
3. Create `.env` from example:
   - `copy .env.example .env` (Windows)
4. Fill all environment variables:
   - `MONGO_URI`
   - `JWT_SECRET`
   - `MASTER_ENCRYPTION_KEY`
   - `POLYGON_RPC_URL`
   - `CONTRACT_ADDRESS`
   - `ADMIN_PRIVATE_KEY`
   - `RAZORPAY_KEY_ID`
   - `RAZORPAY_KEY_SECRET`
   - `TOTP_ISSUER`
5. Start backend:
   - `npm run dev`

Backend runs at `http://localhost:5000`.

## 4) Frontend Setup

1. Go to frontend folder:
   - `cd blockseat/frontend`
2. Install dependencies:
   - `npm install`
3. Start frontend:
   - `npm run dev`

Frontend runs at `http://localhost:3000` (or Vite default if changed).

## 5) Suggested Test Data (MongoDB)

Insert one event document in `events` collection with `eventId: "EVT-001"` and seats like `A1...A6`, `B1...B6`.  
The frontend route `/events/EVT-001` expects this event to exist.

## 6) End-to-End Test Flow

1. **Login**
   - Open frontend, go to `/login`
   - Enter phone and click **Send OTP**
   - Read OTP from backend console (mock SMS log)
   - Verify OTP and observe generated BST ID card
2. **Book Ticket**
   - You are redirected to seat map
   - Select available seat (green) and click **Book Now**
   - Complete Razorpay test checkout
   - Ticket mints on-chain and appears in **My Tickets**
3. **View QR**
   - Open **My Tickets** -> **View QR**
   - QR payload rotates every 70 seconds with dynamic TOTP
4. **Transfer Ticket**
   - Open **Transfer**
   - Enter recipient BST ID and lookup user
   - Enter resale price within cap and complete Razorpay checkout
   - Ticket ownership updates on-chain and in MongoDB
5. **Gate Scan**
   - Open `/gate-scanner`
   - Enter token ID and current TOTP from QR page
   - Receive **VALID - WELCOME IN** for first scan, invalid on reuse

## Notes

- Contract `mint()` and `burnOnEntry()` are admin-only and backend executes them with `ADMIN_PRIVATE_KEY`.
- `resell()` enforces max resale cap and resale-window boolean gate.
- Custodial user keys are AES-encrypted before storage in MongoDB.
