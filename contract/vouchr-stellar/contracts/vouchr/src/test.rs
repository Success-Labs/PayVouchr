#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    token::{Client as TokenClient, StellarAssetClient},
    Address, Env, String,
};

fn setup_env() -> (Env, Address, Address, Address) {
    let env = Env::default();
    env.mock_all_auths();

    // Deploy a test token (Stellar Asset Contract)
    let token_admin = Address::generate(&env);
    let token_id = env.register_stellar_asset_contract_v2(token_admin.clone());
    let token_address = token_id.address();

    let creator = Address::generate(&env);
    let receiver = Address::generate(&env);

    // Mint 1000 tokens to creator
    StellarAssetClient::new(&env, &token_address).mint(&creator, &1000);

    (env, token_address, creator, receiver)
}

fn deploy_contract(env: &Env) -> VouchrContractClient<'_> {
    let contract_id = env.register(VouchrContract, ());
    VouchrContractClient::new(env, &contract_id)
}

#[test]
fn test_create_and_redeem() {
    let (env, token, creator, receiver) = setup_env();
    let client = deploy_contract(&env);

    let code = String::from_str(&env, "VOUCHER123");

    client.create_voucher(&creator, &token, &500, &code, &0);

    assert!(!client.is_redeemed(&code));

    client.redeem(&receiver, &code);

    assert!(client.is_redeemed(&code));

    // Receiver should now hold 500 tokens
    let balance = TokenClient::new(&env, &token).balance(&receiver);
    assert_eq!(balance, 500);
}

#[test]
#[should_panic(expected = "voucher already redeemed")]
fn test_double_spend_prevented() {
    let (env, token, creator, receiver) = setup_env();
    let client = deploy_contract(&env);

    let code = String::from_str(&env, "DOUBLESPEND");
    client.create_voucher(&creator, &token, &100, &code, &0);
    client.redeem(&receiver, &code);
    client.redeem(&receiver, &code); // should panic
}

#[test]
#[should_panic(expected = "voucher has expired")]
fn test_expiry() {
    let (env, token, creator, receiver) = setup_env();
    let client = deploy_contract(&env);

    // Set ledger time to 1000, expire at 500 (already past)
    env.ledger().with_mut(|l| l.timestamp = 1000);

    let code = String::from_str(&env, "EXPIRED");
    client.create_voucher(&creator, &token, &100, &code, &500);
    client.redeem(&receiver, &code); // should panic
}

#[test]
fn test_cancel_refunds_creator() {
    let (env, token, creator, _receiver) = setup_env();
    let client = deploy_contract(&env);

    let code = String::from_str(&env, "CANCEL123");
    client.create_voucher(&creator, &token, &300, &code, &0);

    let before = TokenClient::new(&env, &token).balance(&creator);
    client.cancel(&creator, &code);
    let after = TokenClient::new(&env, &token).balance(&creator);

    assert_eq!(after - before, 300);
}
