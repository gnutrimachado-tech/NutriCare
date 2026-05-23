import Link from "next/link";

const menuItems = [
  { href: "/dashboard", label: "Dashboard" },
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
      <h1
        style={{
          fontSize: "28px",
          fontWeight: "bold",
          marginBottom: "40px",
        }}
      >
        NutriCare
      </h1>

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