"use client";

import Link from "next/link";
import Image from "next/image";
import { signOut } from "next-auth/react";

const menuItems = [
  { href: "/dashboard", label: "Página Inicial" },
  { href: "/pacientes", label: "Pacientes" },
  { href: "/agenda", label: "Agenda" },
  { href: "/planos", label: "Planos Alimentares" },
];

export default function Sidebar() {
  return (
    <aside
      style={{
        width: "260px",
        background:
          "linear-gradient(180deg, rgb(86, 132, 186) 0%, rgb(38, 93, 153) 38%, rgb(19, 49, 91) 100%)",
        color: "white",
        minHeight: "100vh",
        padding: "30px 20px",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          marginBottom: "28px",
          textAlign: "center",
          padding: "0 6px 2px",
        }}
      >
        <Image
          src="/logo-nutricare.png"
          alt="NutriCare"
          width={320}
          height={190}
          style={{
            objectFit: "contain",
            width: "100%",
            height: "auto",
            filter: "drop-shadow(0 8px 14px rgba(0,0,0,0.35))",
          }}
          priority
        />
      </div>

      <nav style={{ flex: 1 }}>
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: "block",
              padding: "12px 16px",
              marginBottom: "10px",
              borderRadius: "8px",
              color: "white",
              textDecoration: "none",
              backgroundColor: "rgba(255,255,255,0.10)",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.06), 0 6px 14px rgba(7, 19, 41, 0.16)",
            }}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        style={{
          marginTop: "20px",
          padding: "12px 16px",
          background: "rgba(220, 38, 38, 0.75)",
          color: "white",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          fontSize: "14px",
          fontWeight: 600,
          width: "100%",
          textAlign: "left",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          transition: "background 0.2s",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = "rgba(220, 38, 38, 0.95)")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.background = "rgba(220, 38, 38, 0.75)")
        }
      >
        <span style={{ fontSize: "16px" }}>🚪</span> Sair da conta
      </button>
    </aside>
  );
}
