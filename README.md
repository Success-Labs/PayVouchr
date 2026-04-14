<div align="center">

# Vouchr

<img src="https://img.shields.io/badge/Stellar-Soroban-blueviolet" alt="Stellar Soroban" />
<img src="https://img.shields.io/badge/Language-Rust-orange" alt="Rust" />
<img src="https://img.shields.io/badge/Frontend-React%20%2B%20TypeScript-blue" alt="React TypeScript" />
<img src="https://img.shields.io/badge/Network-Testnet-green" alt="Testnet" />
<img src="https://img.shields.io/badge/License-MIT-lightgrey" alt="MIT License" />

**Offline-Friendly Payment Voucher System — Crypto for low-internet environments.**

*Send money without internet. Redeem later.*

</div>

---

## The Problem

Across Africa and other emerging markets, internet access is unreliable and often unavailable at the moment a payment needs to happen. People cannot always use crypto wallets live. Traditional payment rails are slow, expensive, or inaccessible. There is a real, daily need for a payment method that works **offline at the point of creation** and settles **on-chain when connectivity is restored**.

Almost nobody is building this on Soroban. Vouchr does.

---

## The Solution

Vouchr is a voucher-based payment system built on the Stellar network using Soroban smart contracts. A sender creates a signed payment voucher — locking real token value on-chain — and shares a simple code or QR with the recipient. The recipient redeems it later, from anywhere, when they have internet access.

```
Sender (online)
  └─ creates voucher → funds locked on-chain → shares code offline
                                                        │
                                              SMS / paper / QR
                                                        │
                                              Recipient (online later)
                                                └─ redeems code → funds received
```

No custodian. No intermediary. No trust required between parties. The contract enforces everything.

---

## Features

| Feature | Description |
|---|---|
| **Offline Voucher Creation** | Generate a voucher code while online. Share it via SMS, paper, or QR — no internet needed on the recipient's end at time of receipt. |
| **On-Chain Fund Locking** | Tokens are transferred from the creator's wallet into the contract at creation time. Funds are guaranteed. |
| **Double-Spend Protection** | The contract marks vouchers as redeemed atomically before releasing funds. A code can only ever be used once. |
| **Optional Expiry** | Creators can set an expiry timestamp. Expired vouchers cannot be redeemed. Set `expires_at = 0` for no expiry. |
| **Creator Cancellation** | Unredeemed vouchers can be cancelled by the original creator, returning funds to their wallet. |
| **Any SAC Token** | Works with any Stellar Asset Contract token — XLM, USDC, or any custom asset. |
| **Re-entrancy Safe** | Voucher state is marked redeemed before the token transfer executes, preventing re-entrancy attacks. |
| **QR Code Sharing** | The UI generates a scannable QR code for every voucher code at creation time. |

---

## Architecture Overview

Vouchr is intentionally minimal for the MVP. No backend is required.

```
vouchr/
├── contract/
│   └── vouchr-stellar/              # Soroban smart contract (Rust)
│       └── contracts/vouchr/
│           └── src/
│               ├── lib.rs           # Contract logic
│               └── test.rs          # Unit tests
└── frontend/
    └── vouchr-ui/                   # React + TypeScript UI (Vite)
        └── src/
            ├── lib/contract.ts      # Stellar SDK integration layer
            └── pages/
                ├── CreateVoucher.tsx
                ├── RedeemVoucher.tsx
                └── VoucherStatus.tsx
```

For a full deep-dive into the system design, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
For a folder-by-folder breakdown, see [docs/STRUCTURE.md](docs/STRUCTURE.md).

---

## Smart Contract API

The contract exposes five public functions:

| Function | Auth Required | Description |
|---|---|---|
| `create_voucher(creator, token, amount, code, expires_at)` | Creator | Locks tokens and stores the voucher on-chain |
| `redeem(receiver, code)` | Receiver | Validates and redeems a voucher, sending funds to receiver |
| `cancel(creator, code)` | Creator | Cancels an unredeemed voucher and refunds the creator |
| `get_voucher(code)` | None | Returns full voucher struct |
| `is_redeemed(code)` | None | Returns boolean redemption status |

Full parameter types, return values, and error conditions are documented in [docs/API.md](docs/API.md).

---

## Getting Started

### Prerequisites

- **Rust (1.70+)** with the WASM target:
  ```bash
  rustup target add wasm32-unknown-unknown
  ```
- **Stellar CLI**:
  ```bash
  cargo install --locked stellar-cli --features opt
  ```
- **Node.js 18+** and **npm**
- A **Freighter** or compatible Stellar wallet for testnet interaction

### 1. Clone the Repository

```bash
git clone https://github.com/<your-org>/vouchr.git
cd vouchr
```

### 2. Build & Test the Smart Contract

```bash
cd contract/vouchr-stellar

# Run all tests
cargo test

# Build the WASM binary
stellar contract build
```

The compiled WASM will be at:
`target/wasm32-unknown-unknown/release/vouchr.wasm`

### 3. Deploy to Testnet

```bash
# Create a testnet identity if you don't have one
stellar keys generate --global alice --network testnet

# Fund it via Friendbot
stellar keys fund alice --network testnet

# Deploy
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/vouchr.wasm \
  --source alice \
  --network testnet
```

Copy the returned contract ID — you'll need it for the frontend.

For full deployment instructions including mainnet, see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

### 4. Run the Frontend

```bash
cd frontend/vouchr-ui

# Copy and fill in your environment variables
cp .env.example .env

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open `http://localhost:5173`.

Your `.env` should look like:

```env
VITE_CONTRACT_ID=<your deployed contract ID>
VITE_RPC_URL=https://soroban-testnet.stellar.org
VITE_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
```

---

## Running Tests

```bash
# From the contract directory
cd contract/vouchr-stellar
cargo test
```

The test suite covers:

- Voucher creation and successful redemption
- Double-spend prevention
- Expiry enforcement
- Creator cancellation and refund

Read the full testing guide: [docs/TESTING.md](docs/TESTING.md)

---

## Stellar Drips Wave

Vouchr is actively participating in the **Stellar Community Fund Drips Wave**. We are looking for contributors to help build the future of offline-friendly payments on Stellar.

- Browse open tasks in the [Issues]() tab
- Read the contribution guide: [CONTRIBUTING.md](CONTRIBUTING.md)

---

## Documentation

| Document | Description |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, contract storage model, security decisions |
| [docs/API.md](docs/API.md) | Full contract function reference with types and errors |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Step-by-step testnet and mainnet deployment |
| [docs/TESTING.md](docs/TESTING.md) | Test suite guide and how to add new tests |
| [docs/STRUCTURE.md](docs/STRUCTURE.md) | Folder and file structure explained |
| [docs/SECURITY.md](docs/SECURITY.md) | Security model, known considerations, disclosure policy |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to contribute — issues, PRs, code style |

---

## Security

Vouchr handles real token value. Security is taken seriously. Please read [docs/SECURITY.md](docs/SECURITY.md) for our vulnerability disclosure policy before reporting any issues.

---

## License

Vouchr is licensed under the **MIT License**. See [LICENSE](LICENSE) for details.
