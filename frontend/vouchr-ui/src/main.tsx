import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import CreateVoucher from "./pages/CreateVoucher";
import RedeemVoucher from "./pages/RedeemVoucher";
import VoucherStatus from "./pages/VoucherStatus";
import "./index.css";

function Nav() {
  return (
    <nav style={{ display: "flex", gap: "1rem", padding: "1rem", borderBottom: "1px solid #eee" }}>
      <Link to="/">Create</Link>
      <Link to="/redeem">Redeem</Link>
      <Link to="/status">Status</Link>
    </nav>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Nav />
      <main style={{ padding: "2rem" }}>
        <Routes>
          <Route path="/" element={<CreateVoucher />} />
          <Route path="/redeem" element={<RedeemVoucher />} />
          <Route path="/status" element={<VoucherStatus />} />
        </Routes>
      </main>
    </BrowserRouter>
  </React.StrictMode>
);
