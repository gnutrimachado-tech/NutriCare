"use client";

import { signOut } from "next-auth/react";

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "100%",
        padding: "12px 16px",
        marginTop: 12,
        background: "rgba(220,38,38,0.15)",
        border: "1px solid rgba(220,38,38,0.35)",
        borderRadius: 8,
        color: "#fecaca",
        fontSize: 14,
        fontWeight: 600,
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
      Sair
    </button>
  );
}
