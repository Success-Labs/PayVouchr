# Testing Guide

This document covers the Vouchr test suite — what is tested, how to run the tests, how to read the output, and how to write new tests.

---

## Overview

Vouchr's test coverage lives in the smart contract layer. The contract is the source of truth for all business logic, so that is where correctness must be verified. The test file is located at:

```
contract/vouchr-stellar/contracts/vouchr/src/test.rs
```

Tests are written using the **Soroban SDK test utilities**, which provide a simulated ledger environment. This means tests run entirely in-process — no network connection, no deployed contract, no wallet required.

---

## Running the Tests

```bash
cd contract/vouchr-stellar
cargo test
```

To see output from passing tests (useful for debugging):

```bash
cargo test -- --nocapture
```

To run a single test by name:

```bash
cargo test test_create_and_redeem
```

To run all tests and show a summary:

```bash
cargo test -- --test-output immediate
```

---

## Test Coverage

The current suite covers four core scenarios:

### `test_create_and_redeem`

Verifies the happy path end-to-end:

1. A creator mints 1000 test tokens
2. Creates a voucher for 500 tokens with code `"VOUCHER123"` and no expiry
3. Asserts `is_redeemed` returns `false`
4. A receiver redeems the voucher
5. Asserts `is_redeemed` returns `true`
6. Asserts the receiver's token balance is exactly 500

This test confirms that the full create → redeem flow works correctly and that funds actually move.

---

### `test_double_spend_prevented`

Verifies that a voucher cannot be redeemed twice:

1. Creates a voucher with code `"DOUBLESPEND"`
2. Redeems it once successfully
3. Attempts to redeem it a second time
4. Expects a panic with message `"voucher already redeemed"`

This is the most critical security test. Double-spend prevention is the core guarantee of the system.

---

### `test_expiry`

Verifies that expired vouchers cannot be redeemed:

1. Sets the simulated ledger timestamp to `1000`
2. Creates a voucher with `expires_at = 500` (already in the past)
3. Attempts to redeem it
4. Expects a panic with message `"voucher has expired"`

This confirms that the expiry check uses the ledger timestamp correctly and that past-expiry vouchers are rejected.

---

### `test_cancel_refunds_creator`

Verifies that cancellation returns funds to the creator:

1. Creates a voucher for 300 tokens
2. Records the creator's balance before cancellation
3. Cancels the voucher
4. Records the creator's balance after cancellation
5. Asserts the difference is exactly 300

This confirms that `cancel` correctly refunds the full locked amount.

---

## Test Infrastructure

### `setup_env`

A shared helper function that sets up a clean test environment:

```rust
fn setup_env() -> (Env, Address, Address, Address) {
    let env = Env::default();
    env.mock_all_auths();  // bypasses require_auth() checks in tests

    let token_admin = Address::generate(&env);
    let token_id = env.register_stellar_asset_contract_v2(token_admin.clone());
    let token_address = token_id.address();

    let creator = Address::generate(&env);
    let receiver = Address::generate(&env);

    // Mint 1000 tokens to creator
    StellarAssetClient::new(&env, &token_address).mint(&creator, &1000);

    (env, token_address, creator, receiver)
}
```

Key points:
- `env.mock_all_auths()` — tells the test environment to approve all `require_auth()` calls automatically. This lets tests focus on business logic without managing real signatures.
- `register_stellar_asset_contract_v2` — deploys a real SAC token contract in the test environment.
- The creator starts with 1000 tokens in every test.

### `deploy_contract`

Deploys a fresh instance of the Vouchr contract for each test:

```rust
fn deploy_contract(env: &Env) -> VouchrContractClient<'_> {
    let contract_id = env.register(VouchrContract, ());
    VouchrContractClient::new(env, &contract_id)
}
```

Each test gets its own isolated contract instance with empty storage.

---

## Test Snapshots

The `test_snapshots/` directory contains JSON snapshots of the ledger state after each test. These are generated automatically by the Soroban test framework and can be used to inspect what was written to storage during a test run.

```
test_snapshots/test/
├── test_cancel_refunds_creator.1.json
├── test_create_and_redeem.1.json
├── test_double_spend_prevented.1.json
└── test_expiry.1.json
```

These snapshots are committed to the repository. If you change contract storage behaviour, the snapshots will need to be regenerated:

```bash
# Delete existing snapshots and re-run tests to regenerate
rm -rf contracts/vouchr/test_snapshots
cargo test
```

---

## Writing New Tests

### Basic structure

```rust
#[test]
fn test_my_new_scenario() {
    let (env, token, creator, receiver) = setup_env();
    let client = deploy_contract(&env);

    // Arrange
    let code = String::from_str(&env, "MY-CODE");
    client.create_voucher(&creator, &token, &100, &code, &0);

    // Act
    // ...

    // Assert
    // ...
}
```

### Testing for expected panics

Use `#[should_panic(expected = "...")]` to assert that a function panics with a specific message:

```rust
#[test]
#[should_panic(expected = "voucher not found")]
fn test_redeem_nonexistent_code() {
    let (env, _token, _creator, receiver) = setup_env();
    let client = deploy_contract(&env);

    let code = String::from_str(&env, "DOESNOTEXIST");
    client.redeem(&receiver, &code);
}
```

### Manipulating ledger time

To test time-sensitive behaviour, use `env.ledger().with_mut`:

```rust
env.ledger().with_mut(|l| l.timestamp = 2000);
```

Set this before the operation you want to test.

### Checking token balances

```rust
use soroban_sdk::token::Client as TokenClient;

let balance = TokenClient::new(&env, &token).balance(&some_address);
assert_eq!(balance, expected_amount);
```

---

## What to Test When Adding Features

When adding a new contract function or modifying existing behaviour, write tests that cover:

1. **The happy path** — the function works correctly with valid inputs
2. **Auth enforcement** — the function rejects calls without proper authorisation (remove `mock_all_auths` for this)
3. **Edge cases** — zero amounts, empty strings, boundary timestamps
4. **Error conditions** — every documented panic message should have a corresponding `should_panic` test

---

## Frontend Testing

Frontend tests are not yet implemented. Contributions adding component tests with Vitest and React Testing Library are welcome. See the Issues tab for the relevant tracking issue.
