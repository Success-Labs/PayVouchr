import { useState } from "react";
import { Keypair } from "@stellar/stellar-sdk";
import { redeemVoucher } from "../lib/contract";

export default function RedeemVoucher() {
  const [secretKey, setSecretKey] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("Redeeming...");
    try {
      const keypair = Keypair.fromSecret(secretKey);
      await redeemVoucher({ receiverKeypair: keypair, code });
      setStatus("Voucher redeemed. Funds sent to your wallet.");
    } catch (err: unknown) {
      setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div>
      <h2>Redeem Voucher</h2>
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
          <label>Voucher Code</label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. GIFT-2025-XYZ"
            required
          />
        </div>
        <button type="submit">Redeem</button>
      </form>
      {status && <p>{status}</p>}
    </div>
  );
}
