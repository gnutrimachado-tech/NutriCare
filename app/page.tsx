"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    setErro("");

    const result = await signIn("credentials", {
      email,
      password: senha,
      redirect: false,
    });

    if (result?.ok) {
      router.push("/dashboard");
      router.refresh();
    } else {
      setErro("E-mail ou senha incorretos.");
      setCarregando(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #f5faf6 0%, #eaf4ee 40%, #f2f8f4 70%, #fafcf7 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(ellipse at 10% 60%, rgba(26,107,60,0.06) 0%, transparent 50%), radial-gradient(ellipse at 90% 20%, rgba(184,148,61,0.07) 0%, transparent 45%), radial-gradient(ellipse at 50% 100%, rgba(26,107,60,0.04) 0%, transparent 50%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          background: "rgba(255,255,255,0.97)",
          backdropFilter: "blur(20px)",
          borderRadius: "24px",
          padding: "48px 42px 40px",
          width: "100%",
          maxWidth: "420px",
          boxShadow:
            "0 24px 64px rgba(0,0,0,0.09), 0 4px 20px rgba(0,0,0,0.05)",
          border: "1px solid rgba(255,255,255,0.9)",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <Image
            src="/logo-nutricare.png"
            alt="NutriCare"
            width={130}
            height={130}
            style={{ objectFit: "contain", marginBottom: "4px" }}
            priority
          />
          <p
            style={{
              fontSize: "10.5px",
              letterSpacing: "3.5px",
              color: "#a08c50",
              fontWeight: 600,
              margin: 0,
              marginTop: "6px",
            }}
          >
            CIÊNCIA · NUTRIÇÃO · BEM-ESTAR
          </p>
        </div>

        {erro && (
          <div
            style={{
              padding: "10px 14px",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "10px",
              color: "#dc2626",
              fontSize: "13px",
              marginBottom: "16px",
              textAlign: "center",
            }}
          >
            {erro}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "14px" }}
        >
          <div style={{ position: "relative" }}>
            <span
              style={{
                position: "absolute",
                left: "14px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#b0b8c8",
                fontSize: "15px",
                pointerEvents: "none",
              }}
            >
              ✉
            </span>
            <input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "13px 14px 13px 42px",
                border: "1.5px solid #e2e8f0",
                borderRadius: "12px",
                fontSize: "14px",
                color: "#1e293b",
                outline: "none",
                boxSizing: "border-box",
                background: "#fafcfd",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#1a6b3c")}
              onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
            />
          </div>

          <div style={{ position: "relative" }}>
            <span
              style={{
                position: "absolute",
                left: "14px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#b0b8c8",
                fontSize: "15px",
                pointerEvents: "none",
              }}
            >
              🔒
            </span>
            <input
              type={mostrarSenha ? "text" : "password"}
              placeholder="Senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "13px 44px 13px 42px",
                border: "1.5px solid #e2e8f0",
                borderRadius: "12px",
                fontSize: "14px",
                color: "#1e293b",
                outline: "none",
                boxSizing: "border-box",
                background: "#fafcfd",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#1a6b3c")}
              onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
            />
            <button
              type="button"
              onClick={() => setMostrarSenha(!mostrarSenha)}
              style={{
                position: "absolute",
                right: "14px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#b0b8c8",
                fontSize: "15px",
                padding: 0,
                lineHeight: 1,
              }}
            >
              {mostrarSenha ? "🙈" : "👁"}
            </button>
          </div>

          <button
            type="submit"
            disabled={carregando}
            style={{
              width: "100%",
              padding: "14px",
              background: carregando
                ? "#94a3b8"
                : "linear-gradient(135deg, #1a6b3c 0%, #145530 100%)",
              color: "white",
              border: "none",
              borderRadius: "12px",
              fontSize: "13.5px",
              fontWeight: 700,
              letterSpacing: "2.5px",
              cursor: carregando ? "not-allowed" : "pointer",
              marginTop: "4px",
              boxShadow: carregando
                ? "none"
                : "0 4px 14px rgba(26,107,60,0.30)",
              transition: "all 0.2s",
            }}
          >
            {carregando ? "ENTRANDO..." : "ENTRAR"}
          </button>
        </form>

        <div
          style={{
            textAlign: "center",
            margin: "20px 0 18px",
            position: "relative",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <span
            style={{ flex: 1, borderTop: "1px solid #e8edf3", display: "block" }}
          />
          <span style={{ color: "#b0b8c8", fontSize: "12.5px", whiteSpace: "nowrap" }}>
            ou
          </span>
          <span
            style={{ flex: 1, borderTop: "1px solid #e8edf3", display: "block" }}
          />
        </div>

        <Link
          href="/cadastro"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            width: "100%",
            padding: "13px",
            border: "1.5px solid #b8943d",
            borderRadius: "12px",
            fontSize: "13.5px",
            fontWeight: 700,
            letterSpacing: "2px",
            color: "#a07830",
            textDecoration: "none",
            textAlign: "center",
            boxSizing: "border-box",
            transition: "all 0.2s",
            background: "transparent",
          }}
        >
          <span style={{ fontSize: "15px" }}>👤</span> CADASTRAR
        </Link>

        <div style={{ textAlign: "center", marginTop: "18px" }}>
          <a
            href="#"
            style={{
              color: "#a0aab8",
              fontSize: "12px",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            🔒 Esqueci minha senha
          </a>
        </div>
      </div>
    </div>
  );
}
