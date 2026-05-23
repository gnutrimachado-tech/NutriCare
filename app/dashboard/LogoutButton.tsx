"use client";

export default function LogoutButton() {
  function handleLogout() {
    window.location.href = "/";
  }

  return (
    <button
      onClick={handleLogout}
      style={{
        marginTop: "20px",
        padding: "10px 20px",
        backgroundColor: "#dc2626",
        color: "white",
        border: "none",
        borderRadius: "6px",
        cursor: "pointer",
      }}
    >
      Sair
    </button>
  );
}