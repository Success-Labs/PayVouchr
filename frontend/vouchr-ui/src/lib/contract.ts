/**
 * Thin wrapper around the Soroban contract calls.
 * Replace CONTRACT_ID and NETWORK_PASSPHRASE with your deployed values.
 */
import {
  Contract,
  Networks,
  TransactionBuilder,
  BASE_FEE,
  nativeToScVal,
  scValToNative,
  SorobanRpc,
  Keypair,
  Address,
} from "@stellar/stellar-sdk";

export const CONTRACT_ID = import.meta.env.VITE_CONTRACT_ID as string;
export const RPC_URL = import.meta.env.VITE_RPC_URL ?? "https://soroban-testnet.stellar.org";
export const NETWORK_PASSPHRASE = import.meta.env.VITE_NETWORK_PASSPHRASE ?? Networks.TESTNET;

const server = new SorobanRpc.Server(RPC_URL);

async function invokeContract(
  method: string,
  args: Parameters<typeof nativeToScVal>[0][],
  signerKeypair: Keypair
) {
  const account = await server.getAccount(signerKeypair.publicKey());
  const contract = new Contract(CONTRACT_ID);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args.map((a) => nativeToScVal(a))))
    .setTimeout(30)
    .build();

  const prepared = await server.prepareTransaction(tx);
  prepared.sign(signerKeypair);

  const result = await server.sendTransaction(prepared);
  return result;
}

export async function createVoucher(params: {
  creatorKeypair: Keypair;
  tokenAddress: string;
  amount: bigint;
  code: string;
  expiresAt: bigint; // 0n = no expiry
}) {
  return invokeContract(
    "create_voucher",
    [
      new Address(params.creatorKeypair.publicKey()),
      new Address(params.tokenAddress),
      params.amount,
      params.code,
      params.expiresAt,
    ],
    params.creatorKeypair
  );
}

export async function redeemVoucher(params: {
  receiverKeypair: Keypair;
  code: string;
}) {
  return invokeContract(
    "redeem",
    [new Address(params.receiverKeypair.publicKey()), params.code],
    params.receiverKeypair
  );
}

export async function getVoucherStatus(code: string): Promise<boolean> {
  const account = await server.getAccount(Keypair.random().publicKey()).catch(() => null);
  if (!account) return false;

  const contract = new Contract(CONTRACT_ID);
  const tx = new TransactionBuilder(account!, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call("is_redeemed", nativeToScVal(code)))
    .setTimeout(30)
    .build();

  const result = await server.simulateTransaction(tx);
  if (SorobanRpc.Api.isSimulationSuccess(result) && result.result) {
    return scValToNative(result.result.retval) as boolean;
  }
  throw new Error("Simulation failed");
}
