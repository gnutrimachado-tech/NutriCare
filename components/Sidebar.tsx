import Link from "next/link";
import Image from "next/image";

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
        background: "#0f172a",
        color: "white",
        minHeight: "100vh",
        padding: "30px 20px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          marginBottom: "32px",
          textAlign: "center",
          padding: "14px 10px 18px",
          borderRadius: "18px",
          background: "linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.04))",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 10px 24px rgba(0,0,0,0.18)",
        }}
      >
        <Image
          src="/logo-nutricare.png"
          alt="NutriCare"
          width={320}
          height={190}
          style={{ objectFit: "contain", width: "100%", height: "auto", filter: "drop-shadow(0 8px 14px rgba(0,0,0,0.35))" }}
          priority
        />
      </div>

      <nav>
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
              backgroundColor: "rgba(255,255,255,0.05)",
            }}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
