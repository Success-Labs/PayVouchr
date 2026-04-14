# API Reference

This document is the complete reference for the Vouchr Soroban smart contract public interface. It covers every callable function, its parameters, return values, authentication requirements, and error conditions.

---

## Contract Overview

The Vouchr contract is deployed on the Stellar network. All interactions go through the Soroban RPC endpoint. The contract ID is set at deployment time and configured in the frontend via the `VITE_CONTRACT_ID` environment variable.

**Soroban SDK version:** `22.0.0`

---

## Data Types

### `Voucher`

The core struct stored on-chain for every voucher.

```rust
pub struct Voucher {
    pub creator: Address,   // Stellar address of the wallet that created the voucher
    pub amount: i128,       // Number of token units locked (use token's decimal precision)
    pub token: Address,     // Contract address of the SAC token
    pub redeemed: bool,     // true if the voucher has been redeemed or cancelled
    pub expires_at: u64,    // Unix timestamp (seconds). 0 means no expiry.
}
```

### `DataKey`

The storage key enum used internally.

```rust
pub enum DataKey {
    Voucher(String),  // keyed by the voucher code string
}
```

---

## Functions

---

### `create_voucher`

Creates a new voucher, locking tokens in the contract.

**Signature**

```rust
pub fn create_voucher(
    env: Env,
    creator: Address,
    token: Address,
    amount: i128,
    code: String,
    expires_at: u64,
)
```

**Parameters**

| Parameter | Type | Description |
|---|---|---|
| `creator` | `Address` | The Stellar address funding the voucher. Must sign the transaction. |
| `token` | `Address` | The SAC token contract address (e.g. USDC, native XLM). |
| `amount` | `i128` | Token units to lock. Must account for the token's decimal precision (e.g. USDC uses 7 decimals, so 1 USDC = `10_000_000`). |
| `code` | `String` | A unique string identifier for this voucher. Chosen by the creator. |
| `expires_at` | `u64` | Unix timestamp after which the voucher cannot be redeemed. Pass `0` for no expiry. |

**Authentication**

Requires `creator.require_auth()`. The transaction must be signed by the creator's keypair.

**Behaviour**

1. Verifies the creator has authorised the call.
2. Checks that no voucher with the given `code` already exists in storage.
3. Calls `token.transfer(creator, contract_address, amount)` to pull funds into the contract.
4. Stores the `Voucher` struct in persistent storage keyed by `code`.

**Returns**

`()` — no return value.

**Errors**

| Condition | Panic message |
|---|---|
| Voucher code already exists | `"voucher code already exists"` |
| Creator has insufficient token balance | Token contract panics (insufficient balance) |
| Creator did not authorise | Auth error from Soroban host |

**Example (TypeScript)**

```typescript
import { createVoucher } from "./lib/contract";
import { Keypair } from "@stellar/stellar-sdk";

await createVoucher({
  creatorKeypair: Keypair.fromSecret("S..."),
  tokenAddress: "C...",   // SAC token contract ID
  amount: 10_000_000n,    // 1 USDC (7 decimals)
  code: "GIFT-2025-ABC",
  expiresAt: 0n,          // no expiry
});
```

---

### `redeem`

Redeems a voucher, transferring the locked funds to the receiver.

**Signature**

```rust
pub fn redeem(
    env: Env,
    receiver: Address,
    code: String,
)
```

**Parameters**

| Parameter | Type | Description |
|---|---|---|
| `receiver` | `Address` | The Stellar address that will receive the funds. Must sign the transaction. |
| `code` | `String` | The voucher code to redeem. |

**Authentication**

Requires `receiver.require_auth()`. The transaction must be signed by the receiver's keypair.

**Behaviour**

1. Verifies the receiver has authorised the call.
2. Loads the voucher from persistent storage.
3. Checks `redeemed == false`.
4. If `expires_at != 0`, checks `ledger.timestamp() <= expires_at`.
5. Sets `redeemed = true` and writes back to storage (re-entrancy guard).
6. Calls `token.transfer(contract_address, receiver, amount)`.

**Returns**

`()` — no return value.

**Errors**

| Condition | Panic message |
|---|---|
| Voucher code does not exist | `"voucher not found"` |
| Voucher already redeemed or cancelled | `"voucher already redeemed"` |
| Voucher has passed its expiry timestamp | `"voucher has expired"` |
| Receiver did not authorise | Auth error from Soroban host |

**Example (TypeScript)**

```typescript
import { redeemVoucher } from "./lib/contract";
import { Keypair } from "@stellar/stellar-sdk";

await redeemVoucher({
  receiverKeypair: Keypair.fromSecret("S..."),
  code: "GIFT-2025-ABC",
});
```

---

### `cancel`

Cancels an unredeemed voucher and refunds the locked tokens to the creator.

**Signature**

```rust
pub fn cancel(
    env: Env,
    creator: Address,
    code: String,
)
```

**Parameters**

| Parameter | Type | Description |
|---|---|---|
| `creator` | `Address` | The original creator of the voucher. Must sign the transaction. |
| `code` | `String` | The voucher code to cancel. |

**Authentication**

Requires `creator.require_auth()`. Additionally, the contract verifies that `voucher.creator == creator` on-chain, so only the original creator can cancel.

**Behaviour**

1. Verifies the creator has authorised the call.
2. Loads the voucher from persistent storage.
3. Checks `redeemed == false`.
4. Verifies `voucher.creator == creator`.
5. Sets `redeemed = true` and writes back to storage.
6. Calls `token.transfer(contract_address, creator, amount)` to refund.

**Returns**

`()` — no return value.

**Errors**

| Condition | Panic message |
|---|---|
| Voucher code does not exist | `"voucher not found"` |
| Voucher already redeemed | `"cannot cancel a redeemed voucher"` |
| Caller is not the original creator | `"only the creator can cancel"` |
| Creator did not authorise | Auth error from Soroban host |

**Example (TypeScript)**

```typescript
// No dedicated helper in lib/contract.ts yet — invoke directly:
import { Contract, TransactionBuilder, nativeToScVal, Address } from "@stellar/stellar-sdk";

const contract = new Contract(CONTRACT_ID);
const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
  .addOperation(contract.call(
    "cancel",
    nativeToScVal(new Address(creatorPublicKey)),
    nativeToScVal("GIFT-2025-ABC"),
  ))
  .setTimeout(30)
  .build();
```

---

### `get_voucher`

Returns the full `Voucher` struct for a given code.

**Signature**

```rust
pub fn get_voucher(env: Env, code: String) -> Voucher
```

**Parameters**

| Parameter | Type | Description |
|---|---|---|
| `code` | `String` | The voucher code to look up. |

**Authentication**

None required. This is a read-only call and can be simulated without signing.

**Returns**

A `Voucher` struct with fields: `creator`, `amount`, `token`, `redeemed`, `expires_at`.

**Errors**

| Condition | Panic message |
|---|---|
| Voucher code does not exist | `"voucher not found"` |

---

### `is_redeemed`

Returns a boolean indicating whether a voucher has been redeemed or cancelled.

**Signature**

```rust
pub fn is_redeemed(env: Env, code: String) -> bool
```

**Parameters**

| Parameter | Type | Description |
|---|---|---|
| `code` | `String` | The voucher code to check. |

**Authentication**

None required. This is a read-only call.

**Returns**

`true` if the voucher has been redeemed or cancelled. `false` if it is still valid and unredeemed.

**Errors**

| Condition | Panic message |
|---|---|
| Voucher code does not exist | `"voucher not found"` |

**Example (TypeScript)**

```typescript
import { getVoucherStatus } from "./lib/contract";

const redeemed = await getVoucherStatus("GIFT-2025-ABC");
console.log(redeemed ? "Already used" : "Still valid");
```

---

## Token Decimal Precision

Vouchr works with any SAC token. The `amount` field is always in the token's smallest unit. Common tokens on Stellar use **7 decimal places**:

| Token | Decimals | 1 unit in `amount` |
|---|---|---|
| USDC | 7 | `10_000_000` |
| Native XLM | 7 | `10_000_000` |
| Custom SAC | varies | check token contract |

Always verify the decimal precision of the token you are using before creating a voucher.

---

## Error Reference

All errors are Rust panics that propagate as Soroban invocation failures. The frontend should catch these and display user-friendly messages.

| Error string | Meaning |
|---|---|
| `"voucher code already exists"` | A voucher with this code was already created |
| `"voucher not found"` | No voucher exists for this code |
| `"voucher already redeemed"` | The voucher was already redeemed or cancelled |
| `"voucher has expired"` | The current ledger time is past `expires_at` |
| `"cannot cancel a redeemed voucher"` | Attempted to cancel an already-redeemed voucher |
| `"only the creator can cancel"` | The caller is not the original creator |
