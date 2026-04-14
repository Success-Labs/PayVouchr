import { useState } from "react";
import { getVoucherStatus } from "../lib/contract";

export default function VoucherStatus() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);
    setError(null);
    try {
      const redeemed = await getVoucherStatus(code);
      setResult(redeemed);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div>
      <h2>Check Voucher Status</h2>
      <form onSubmit={handleCheck}>
        <div className="field">
          <label>Voucher Code</label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. GIFT-2025-XYZ"
            required
          />
        </div>
        <button type="submit">Check</button>
      </form>
      {result !== null && (
        <p style={{ marginTop: "1rem", fontWeight: 600 }}>
          Status: {result ? "✅ Redeemed" : "🟡 Unused"}
        </p>
      )}
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}
