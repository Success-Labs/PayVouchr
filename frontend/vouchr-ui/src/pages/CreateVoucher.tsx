import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Keypair } from "@stellar/stellar-sdk";
import { createVoucher } from "../lib/contract";

export default function CreateVoucher() {
  const [secretKey, setSecretKey] = useState("");
  const [tokenAddress, setTokenAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [code, setCode] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("Submitting...");
    try {
      const keypair = Keypair.fromSecret(secretKey);
      await createVoucher({
        creatorKeypair: keypair,
        tokenAddress,
        amount: BigInt(amount),
        code,
        expiresAt: expiresAt ? BigInt(Math.floor(new Date(expiresAt).getTime() / 1000)) : 0n,
      });
      setStatus("Voucher created.");
      setDone(true);
    } catch (err: unknown) {
      setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div>
      <h2>Create Voucher</h2>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Your Secret Key</label>
          <input
            type="password"
            value={secretKey}
            onChange={(e) => setSecretKey(e.target.value)}
            placeholder="S..."
            required
          />
        </div>
        <div className="field">
          <label>Token Contract Address</label>
          <input
            value={tokenAddress}
            onChange={(e) => setTokenAddress(e.target.value)}
            placeholder="C..."
            required
          />
        </div>
        <div className="field">
          <label>Amount (in token units)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="5000000"
            required
          />
        </div>
        <div className="field">
          <label>Voucher Code</label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. GIFT-2025-XYZ"
            required
          />
        </div>
        <div className="field">
          <label>Expires At (optional)</label>
          <input
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
          />
        </div>
        <button type="submit">Create Voucher</button>
      </form>

      {status && <p>{status}</p>}

      {done && code && (
        <div style={{ marginTop: "1.5rem" }}>
          <p>Share this code or QR with the recipient:</p>
          <code style={{ fontSize: "1.25rem" }}>{code}</code>
          <div style={{ marginTop: "1rem" }}>
            <QRCodeSVG value={code} size={180} />
          </div>
        </div>
      )}
    </div>
  );
}
