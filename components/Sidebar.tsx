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
      <div style={{ marginBottom: "40px", textAlign: "center" }}>
        <Image
          src="/logo-nutricare.png"
          alt="NutriCare"
          width={260}
          height={140}
          style={{ objectFit: "contain" }}
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
