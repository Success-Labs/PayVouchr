# Architecture

This document describes the system design of Vouchr — the decisions made, the trade-offs considered, and how the components fit together.

---

## Overview

Vouchr is a voucher-based payment system built on the Stellar network using Soroban smart contracts. The architecture is intentionally minimal for the MVP: a single Soroban contract handles all business logic, and a lightweight React frontend provides the user interface. No backend server is required.

```
┌─────────────────────────────────────────────────────────┐
│                        User                             │
│              (browser / mobile browser)                 │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTPS
┌───────────────────────▼─────────────────────────────────┐
│                  React Frontend                         │
│              (Vite + TypeScript + React)                │
│                                                         │
│  CreateVoucher  │  RedeemVoucher  │  VoucherStatus      │
└───────────────────────┬─────────────────────────────────┘
                        │ Stellar SDK (stellar-sdk)
                        │ JSON-RPC over HTTPS
┌───────────────────────▼─────────────────────────────────┐
│              Soroban RPC Node                           │
│         (soroban-testnet.stellar.org)                   │
└───────────────────────┬─────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────┐
│              Stellar Ledger (Testnet / Mainnet)         │
│                                                         │
│   ┌─────────────────────────────────────────────────┐   │
│   │           Vouchr Soroban Contract               │   │
│   │                                                 │   │
│   │  create_voucher │ redeem │ cancel               │   │
│   │  get_voucher    │ is_redeemed                   │   │
│   │                                                 │   │
│   │  Persistent Storage: Voucher records            │   │
│   └─────────────────────────────────────────────────┘   │
│                                                         │
│   ┌─────────────────────────────────────────────────┐   │
│   │         SAC Token Contract (e.g. USDC)          │   │
│   └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## Smart Contract Design

### Language and Platform

The contract is written in Rust and compiled to WebAssembly (WASM) for deployment on the Soroban smart contract platform. Rust was chosen for:

- Memory safety without a garbage collector
- Strong type system that catches logic errors at compile time
- First-class support in the Soroban SDK
- Minimal WASM binary size with `opt-level = "z"`

### Data Model

The core data structure is the `Voucher` struct:

```rust
pub struct Voucher {
    pub creator: Address,   // wallet that funded the voucher
    pub amount: i128,       // token units locked
    pub token: Address,     // SAC token contract address
    pub redeemed: bool,     // true after redeem() or cancel()
    pub expires_at: u64,    // Unix timestamp; 0 = no expiry
}
```

Vouchers are keyed by a user-chosen string code:

```rust
pub enum DataKey {
    Voucher(String),
}
```

### Storage Strategy

All voucher records use **Persistent Storage**. This is the correct choice because:

- Vouchers must survive indefinitely until explicitly redeemed or cancelled
- Persistent storage is not automatically evicted by the network
- TTL is extended on every access, keeping active vouchers alive

Temporary or Instance storage would be inappropriate here — vouchers represent locked funds and must not disappear due to ledger eviction.

### Token Handling

Vouchr does not implement its own token. It integrates with any **Stellar Asset Contract (SAC)** token via the standard `token::Client` interface from the Soroban SDK. This means it works with:

- Native XLM (wrapped)
- USDC on Stellar
- Any custom SAC-compliant asset

Token transfers happen in two directions:

1. `create_voucher` — pulls tokens from the creator into the contract (`transfer` from creator to `current_contract_address`)
2. `redeem` / `cancel` — pushes tokens from the contract to the receiver or creator

### Authentication

Every state-changing function uses `require_auth()` on the relevant address:

- `create_voucher` — requires the creator's signature
- `redeem` — requires the receiver's signature
- `cancel` — requires the creator's signature, and additionally verifies `voucher.creator == creator` on-chain

Read-only functions (`get_voucher`, `is_redeemed`) require no authentication.

---

## Security Design

### Re-entrancy Prevention

The `redeem` and `cancel` functions follow a strict **checks-effects-interactions** pattern:

1. Validate all conditions (not redeemed, not expired, correct creator)
2. Mark the voucher as redeemed in storage **before** calling the token transfer
3. Execute the token transfer

This ensures that even if the token contract were to call back into Vouchr during the transfer, the voucher would already be marked redeemed and the call would fail.

### Double-Spend Prevention

The `redeemed` flag is the single source of truth. Once set to `true` — whether by `redeem` or `cancel` — no further redemption or cancellation is possible. The check happens before any funds move.

### Code Uniqueness

The contract panics if a voucher code already exists in storage:

```rust
if env.storage().persistent().has(&key) {
    panic!("voucher code already exists");
}
```

This prevents a creator from overwriting an existing voucher with a new one.

### Expiry

Expiry is checked against `env.ledger().timestamp()`, which is the consensus timestamp of the current ledger. This cannot be manipulated by the caller. A voucher with `expires_at = 0` never expires.

---

## Frontend Design

The frontend is a single-page React application built with Vite. It has three pages:

| Page | Route | Purpose |
|---|---|---|
| CreateVoucher | `/` | Fund and create a new voucher |
| RedeemVoucher | `/redeem` | Redeem a voucher by code |
| VoucherStatus | `/status` | Check if a voucher has been redeemed |

### SDK Integration

All contract interactions are handled in `src/lib/contract.ts`. This module:

- Reads configuration from environment variables (`VITE_CONTRACT_ID`, `VITE_RPC_URL`, `VITE_NETWORK_PASSPHRASE`)
- Builds and signs Soroban transactions using `@stellar/stellar-sdk`
- Submits transactions via `SorobanRpc.Server`
- Uses `simulateTransaction` for read-only calls to avoid unnecessary fees

### QR Code Sharing

After a voucher is created, the UI renders a QR code of the voucher code using `qrcode.react`. This allows the code to be shared physically — printed, photographed, or scanned — without any internet connection on the recipient's side.

---

## Design Decisions and Trade-offs

### No Backend

The MVP has no backend server. All state lives on-chain. This simplifies deployment, eliminates a trust surface, and makes the system fully decentralised. The trade-off is that features like push notifications, voucher indexing, and analytics are not available in the MVP.

### Secret Key in UI (MVP Only)

The current frontend accepts a raw Stellar secret key for signing. This is acceptable for a testnet MVP but is not suitable for production. The production path is to integrate Freighter wallet (or another browser extension wallet) so that private keys never leave the user's device.

### String Voucher Codes

Voucher codes are arbitrary strings chosen by the creator. This is flexible but means the security of a voucher depends on the unpredictability of the code. Creators should use sufficiently random codes. A future improvement could generate cryptographically random codes in the UI.

---

## Future Architecture

The following components are planned but not yet implemented:

- **Freighter wallet integration** — replace raw secret key input
- **Backend indexer** — index voucher events for analytics and notifications
- **Batch voucher creation** — create multiple vouchers in a single transaction
- **Delegated redemption** — allow a third party to redeem on behalf of a recipient
- **Mobile-optimised UI** — QR scanning directly from the browser camera

See the Issues tab for open tasks.
