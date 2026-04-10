# BlockSeat - Ee sala ticket namdhe guru..

BlockSeat is a blockchain-based NFT ticketing platform built to reduce black-market ticket reselling.  
It uses ERC-721 tickets on Polygon Amoy, a Node/Express backend, and a React frontend with OTP login, Razorpay payments, capped resale, transfer requests, and QR-based gate validation.

## Monorepo Structure

- `blockchain/` - Solidity contract and Hardhat config
- `backend/` - Express APIs, MongoDB models, blockchain + payment integrations
- `frontend/` - React app with booking, QR display, transfer requests, ticket verification, and gate admin utility

## Prerequisites

- Node.js 18+
- MongoDB Atlas or local MongoDB
- Polygon Amoy RPC provider
- Razorpay test account keys

## Smart Contract

The main contract is:

- [`blockchain/contracts/BlockSeatTicket.sol`](blockchain/contracts/BlockSeatTicket.sol)

It supports:

- ERC-721 minting
- Capped resale
- Ticket usage marking at the gate
- Transfer count tracking

## Backend Setup

1. Go to backend:
   - `cd backend`
2. Install dependencies:
   - `npm install`
3. Copy environment file:
   - `copy .env.example .env`
4. Fill in:
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
