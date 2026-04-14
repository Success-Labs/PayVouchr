#![no_std]

mod test;

use soroban_sdk::{
    contract, contractimpl, contracttype,
    token, Address, Env, String,
};

// ── Storage keys ──────────────────────────────────────────────────────────────

#[contracttype]
pub enum DataKey {
    Voucher(String), // keyed by voucher code
}

// ── Voucher data stored on-chain ───────────────────────────────────────────────

#[contracttype]
#[derive(Clone)]
pub struct Voucher {
    pub creator: Address,
    pub amount: i128,
    pub token: Address,
    pub redeemed: bool,
    pub expires_at: u64, // ledger timestamp; 0 = no expiry
}

// ── Contract ───────────────────────────────────────────────────────────────────

#[contract]
pub struct VouchrContract;

#[contractimpl]
impl VouchrContract {
    /// Create a voucher.
    ///
    /// - `creator`    – wallet funding the voucher
    /// - `token`      – SAC token address (e.g. USDC, XLM wrapped)
    /// - `amount`     – token units to lock
    /// - `code`       – unique voucher code chosen by creator
    /// - `expires_at` – Unix timestamp after which voucher is invalid (0 = never)
    pub fn create_voucher(
        env: Env,
        creator: Address,
        token: Address,
        amount: i128,
        code: String,
        expires_at: u64,
    ) {
        // Creator must sign this call
        creator.require_auth();

        // Reject if code already exists
        let key = DataKey::Voucher(code.clone());
        if env.storage().persistent().has(&key) {
            panic!("voucher code already exists");
        }

        // Pull tokens from creator into the contract
        let token_client = token::Client::new(&env, &token);
        token_client.transfer(&creator, &env.current_contract_address(), &amount);

        // Persist voucher
        let voucher = Voucher {
            creator,
            amount,
            token,
            redeemed: false,
            expires_at,
        };
        env.storage().persistent().set(&key, &voucher);
    }

    /// Redeem a voucher.
    ///
    /// - `receiver` – wallet that will receive the funds
    /// - `code`     – voucher code
    pub fn redeem(env: Env, receiver: Address, code: String) {
        // Receiver must sign this call
        receiver.require_auth();

        let key = DataKey::Voucher(code.clone());

        let mut voucher: Voucher = env
            .storage()
            .persistent()
            .get(&key)
            .expect("voucher not found");

        if voucher.redeemed {
            panic!("voucher already redeemed");
        }

        // Check expiry (0 means no expiry)
        if voucher.expires_at != 0 {
            let now = env.ledger().timestamp();
            if now > voucher.expires_at {
                panic!("voucher has expired");
            }
        }

        // Mark as redeemed BEFORE transfer (re-entrancy guard)
        voucher.redeemed = true;
        env.storage().persistent().set(&key, &voucher);

        // Send tokens to receiver
        let token_client = token::Client::new(&env, &voucher.token);
        token_client.transfer(&env.current_contract_address(), &receiver, &voucher.amount);
    }

    /// Returns voucher details, or panics if not found.
    pub fn get_voucher(env: Env, code: String) -> Voucher {
        let key = DataKey::Voucher(code);
        env.storage()
            .persistent()
            .get(&key)
            .expect("voucher not found")
    }

    /// Convenience: returns true if the voucher has been redeemed.
    pub fn is_redeemed(env: Env, code: String) -> bool {
        let key = DataKey::Voucher(code);
        match env.storage().persistent().get::<DataKey, Voucher>(&key) {
            Some(v) => v.redeemed,
            None => panic!("voucher not found"),
        }
    }

    /// Creator can cancel an unredeemed voucher and reclaim funds.
    pub fn cancel(env: Env, creator: Address, code: String) {
        creator.require_auth();

        let key = DataKey::Voucher(code.clone());
        let mut voucher: Voucher = env
            .storage()
            .persistent()
            .get(&key)
            .expect("voucher not found");

        if voucher.redeemed {
            panic!("cannot cancel a redeemed voucher");
        }

        if voucher.creator != creator {
            panic!("only the creator can cancel");
        }

        voucher.redeemed = true; // mark so it can't be redeemed after cancel
        env.storage().persistent().set(&key, &voucher);

        // Refund creator
        let token_client = token::Client::new(&env, &voucher.token);
        token_client.transfer(&env.current_contract_address(), &creator, &voucher.amount);
    }
}
