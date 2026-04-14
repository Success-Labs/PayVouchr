# Deployment Guide

This guide covers everything needed to deploy Vouchr from source — from building the WASM binary to running the frontend against a live contract on testnet or mainnet.

---

## Prerequisites

Before you begin, make sure you have the following installed:

**Rust and WASM target**

```bash
# Install Rust via rustup if you haven't already
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Add the WASM compilation target
rustup target add wasm32-unknown-unknown
```

**Stellar CLI**

```bash
cargo install --locked stellar-cli --features opt
```

Verify the installation:

```bash
stellar --version
```

**Node.js 18+**

Download from [nodejs.org](https://nodejs.org) or use a version manager like `nvm`:

```bash
nvm install 18
nvm use 18
```

---

## Step 1 — Build the Smart Contract

Navigate to the contract workspace and build the WASM binary:

```bash
cd contract/vouchr-stellar

# Build optimised WASM
stellar contract build
```

The compiled binary will be at:

```
contract/vouchr-stellar/target/wasm32-unknown-unknown/release/vouchr.wasm
```

You can also build with standard Cargo:

```bash
cargo build --target wasm32-unknown-unknown --release
```

---

## Step 2 — Set Up a Stellar Identity

The Stellar CLI manages named keypairs called "identities". You need one to sign deployment transactions.

```bash
# Generate a new identity named "deployer"
stellar keys generate --global deployer --network testnet
```

This creates a keypair and stores it locally. To see the public key:

```bash
stellar keys address deployer
```

---

## Step 3 — Fund the Identity (Testnet Only)

On testnet, use Friendbot to fund your deployer address with test XLM:

```bash
stellar keys fund deployer --network testnet
```

Alternatively, visit [https://friendbot.stellar.org](https://friendbot.stellar.org) and paste your public key.

For mainnet, you will need to fund the address with real XLM from an exchange or another wallet.

---

## Step 4 — Deploy to Testnet

```bash
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/vouchr.wasm \
  --source deployer \
  --network testnet
```

On success, the CLI prints a contract ID that looks like:

```
CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

Save this — you will need it for the frontend configuration.

---

## Step 5 — Verify the Deployment

Confirm the contract is live by calling a read function:

```bash
stellar contract invoke \
  --id <YOUR_CONTRACT_ID> \
  --source deployer \
  --network testnet \
  -- \
  is_redeemed \
  --code "TEST"
```

This will panic with `"voucher not found"` — which is expected and confirms the contract is responding correctly.

---

## Step 6 — Configure the Frontend

Navigate to the frontend directory:

```bash
cd frontend/vouchr-ui
```

Copy the environment example file:

```bash
cp .env.example .env
```

Edit `.env` and fill in your values:

```env
VITE_CONTRACT_ID=CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_RPC_URL=https://soroban-testnet.stellar.org
VITE_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
```

---

## Step 7 — Run the Frontend

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Step 8 — Build for Production

To build a static production bundle:

```bash
npm run build
```

The output will be in `frontend/vouchr-ui/dist/`. You can serve this with any static hosting provider (Vercel, Netlify, Cloudflare Pages, etc.).

---

## Mainnet Deployment

Deploying to mainnet follows the same steps with different network parameters.

### 1. Generate a mainnet identity

```bash
stellar keys generate --global mainnet-deployer
```

Fund this address with real XLM before proceeding.

### 2. Deploy

```bash
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/vouchr.wasm \
  --source mainnet-deployer \
  --network mainnet
```

### 3. Update frontend environment

```env
VITE_CONTRACT_ID=<mainnet contract ID>
VITE_RPC_URL=https://soroban-mainnet.stellar.org
VITE_NETWORK_PASSPHRASE=Public Global Stellar Network ; September 2015
```

> **Warning:** Mainnet deployments handle real funds. Test thoroughly on testnet before deploying to mainnet. Review [docs/SECURITY.md](SECURITY.md) before going live.

---

## Upgrading the Contract

Soroban contracts can be upgraded by deploying a new WASM and calling `upgrade` if the contract implements it. The current Vouchr contract does not implement an upgrade mechanism in the MVP. To upgrade:

1. Deploy the new WASM as a new contract
2. Update `VITE_CONTRACT_ID` in the frontend
3. Existing vouchers on the old contract remain valid until redeemed or expired

A future version will implement in-place upgrades via the Soroban `update_current_contract_wasm` host function.

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `VITE_CONTRACT_ID` | Yes | The deployed Vouchr contract ID |
| `VITE_RPC_URL` | No | Soroban RPC endpoint. Defaults to testnet. |
| `VITE_NETWORK_PASSPHRASE` | No | Network passphrase. Defaults to testnet. |

---

## Troubleshooting

**`Error: account not found`**

Your deployer identity is not funded. Run `stellar keys fund deployer --network testnet` or fund manually via Friendbot.

**`Error: insufficient balance`**

The creator wallet does not have enough tokens to fund the voucher. Make sure the wallet holds the token you are trying to lock.

**`wasm file not found`**

Run `stellar contract build` from inside `contract/vouchr-stellar/` before deploying.

**Frontend shows `CONTRACT_ID is undefined`**

Make sure your `.env` file exists and starts with `VITE_`. Vite only exposes variables prefixed with `VITE_` to the browser.
