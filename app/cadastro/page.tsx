"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

const ESTADOS_CRN = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

const AREAS_ATUACAO = [
  "Clínica", "Esportiva", "Oncológica", "Pediátrica", "Materno-infantil",
  "Hospitalar", "Estética", "Gerontológica", "Coletividades", "Outra",
];

export default function CadastroPage() {
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [crn, setCrn] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");

    if (senha !== confirmarSenha) {
      setErro("As senhas não coincidem.");
      return;
    }
    if (senha.length < 6) {
      setErro("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setCarregando(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, email, senha, telefone, crn }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.error || "Erro ao realizar cadastro.");
      } else {
        setSucesso(true);
        setTimeout(() => router.push("/"), 2000);
      }
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  const inputStyle = {
    width: "100%",
    padding: "12px 14px",
    border: "1.5px solid #e2e8f0",
    borderRadius: "10px",
    fontSize: "13.5px",
    color: "#1e293b",
    outline: "none",
    boxSizing: "border-box" as const,
    background: "#fafcfd",
    transition: "border-color 0.2s",
  };

  const inputWithIconStyle = {
    ...inputStyle,
    paddingLeft: "42px",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #f5faf6 0%, #eaf4ee 40%, #f2f8f4 70%, #fafcf7 100%)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "32px 20px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(ellipse at 10% 60%, rgba(26,107,60,0.06) 0%, transparent 50%), radial-gradient(ellipse at 90% 20%, rgba(184,148,61,0.07) 0%, transparent 45%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          background: "rgba(255,255,255,0.97)",
          borderRadius: "24px",
          padding: "0 0 40px",
          width: "100%",
          maxWidth: "480px",
          boxShadow: "0 24px 64px rgba(0,0,0,0.09), 0 4px 20px rgba(0,0,0,0.05)",
          border: "1px solid rgba(255,255,255,0.9)",
          position: "relative",
          zIndex: 1,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            background:
              "linear-gradient(135deg, #f5faf6 0%, #eaf4ee 100%)",
            padding: "32px 40px 28px",
            textAlign: "center",
            borderBottom: "1px solid #e8f0eb",
          }}
        >
          <Image
            src="/logo-nutricare.png"
            alt="NutriCare"
            width={100}
            height={100}
            style={{ objectFit: "contain", marginBottom: "4px" }}
            priority
          />
          <p
            style={{
              fontSize: "10px",
              letterSpacing: "3px",
              color: "#a08c50",
              fontWeight: 600,
              margin: "6px 0 0",
            }}
          >
            CIÊNCIA · NUTRIÇÃO · BEM-ESTAR
          </p>
        </div>

        <div style={{ padding: "28px 40px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
            <span style={{ fontSize: "26px" }}>👤</span>
            <div>
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#1a4d2e" }}>
                Criar sua conta
              </h2>
              <p style={{ margin: 0, fontSize: "13px", color: "#7a9e8a" }}>
                Preencha seus dados para se cadastrar
              </p>
            </div>
          </div>

          <div style={{ textAlign: "center", margin: "16px 0", color: "#b8943d", fontSize: "18px" }}>🍃</div>

          {sucesso ? (
            <div
              style={{
                padding: "16px",
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: "12px",
                color: "#16a34a",
                textAlign: "center",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              ✅ Cadastro realizado! Redirecionando para o login...
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {erro && (
                <div
                  style={{
                    padding: "10px 14px",
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: "10px",
                    color: "#dc2626",
                    fontSize: "13px",
                    textAlign: "center",
                  }}
                >
                  {erro}
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#b0b8c8", fontSize: "14px", pointerEvents: "none" }}>👤</span>
                  <input
                    type="text"
                    placeholder="Nome completo"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    required
                    style={inputWithIconStyle}
                    onFocus={(e) => (e.target.style.borderColor = "#1a6b3c")}
                    onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                  />
                </div>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#b0b8c8", fontSize: "14px", pointerEvents: "none" }}>📱</span>
                  <input
                    type="tel"
                    placeholder="Telefone / WhatsApp"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    style={inputWithIconStyle}
                    onFocus={(e) => (e.target.style.borderColor = "#1a6b3c")}
                    onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                  />
                </div>
              </div>

              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#b0b8c8", fontSize: "14px", pointerEvents: "none" }}>✉</span>
                <input
                  type="email"
                  placeholder="E-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={inputWithIconStyle}
                  onFocus={(e) => (e.target.style.borderColor = "#1a6b3c")}
                  onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#b0b8c8", fontSize: "13px", pointerEvents: "none" }}>🔒</span>
                  <input
                    type={mostrarSenha ? "text" : "password"}
                    placeholder="Senha"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    required
                    style={{ ...inputWithIconStyle, paddingRight: "36px" }}
                    onFocus={(e) => (e.target.style.borderColor = "#1a6b3c")}
                    onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                  />
                  <button type="button" onClick={() => setMostrarSenha(!mostrarSenha)} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#b0b8c8", fontSize: "13px", padding: 0 }}>
                    {mostrarSenha ? "🙈" : "👁"}
                  </button>
                </div>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#b0b8c8", fontSize: "13px", pointerEvents: "none" }}>🔒</span>
                  <input
                    type={mostrarConfirmar ? "text" : "password"}
                    placeholder="Confirmar senha"
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                    required
                    style={{ ...inputWithIconStyle, paddingRight: "36px" }}
                    onFocus={(e) => (e.target.style.borderColor = "#1a6b3c")}
                    onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                  />
                  <button type="button" onClick={() => setMostrarConfirmar(!mostrarConfirmar)} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#b0b8c8", fontSize: "13px", padding: 0 }}>
                    {mostrarConfirmar ? "🙈" : "👁"}
                  </button>
                </div>
              </div>

              <div style={{ borderTop: "1.5px solid #f0f4f8", paddingTop: "14px", marginTop: "2px" }}>
                <p style={{ margin: "0 0 10px", fontSize: "12.5px", fontWeight: 700, color: "#475569", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ color: "#b8943d" }}>▬▬</span> Dados profissionais <span style={{ color: "#b8943d" }}>▬▬</span>
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#b0b8c8", fontSize: "13px", pointerEvents: "none" }}>🪪</span>
                    <input
                      type="text"
                      placeholder="CRN"
                      value={crn}
                      onChange={(e) => setCrn(e.target.value)}
                      style={inputWithIconStyle}
                      onFocus={(e) => (e.target.style.borderColor = "#1a6b3c")}
                      onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                    />
                  </div>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#b0b8c8", fontSize: "13px", pointerEvents: "none" }}>🏢</span>
                    <input
                      type="text"
                      placeholder="CNPJ (opcional)"
                      style={inputWithIconStyle}
                      onFocus={(e) => (e.target.style.borderColor = "#1a6b3c")}
                      onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                    />
                  </div>
                </div>
              </div>

              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#b0b8c8", fontSize: "13px", pointerEvents: "none" }}>📍</span>
                <select
                  style={{ ...inputWithIconStyle, appearance: "none" as const }}
                  onFocus={(e) => (e.target.style.borderColor = "#1a6b3c")}
                  onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                  defaultValue=""
                >
                  <option value="" disabled>Estado do CRN</option>
                  {ESTADOS_CRN.map((uf) => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
              </div>

              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#b0b8c8", fontSize: "13px", pointerEvents: "none" }}>💼</span>
                <select
                  style={{ ...inputWithIconStyle, appearance: "none" as const }}
                  onFocus={(e) => (e.target.style.borderColor = "#1a6b3c")}
                  onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                  defaultValue=""
                >
                  <option value="" disabled>Área de atuação</option>
                  {AREAS_ATUACAO.map((area) => (
                    <option key={area} value={area}>{area}</option>
                  ))}
                </select>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "8px",
                  padding: "10px 12px",
                  background: "#f8fafc",
                  borderRadius: "8px",
                  marginTop: "2px",
                }}
              >
                <span style={{ fontSize: "14px", marginTop: "1px" }}>🛡️</span>
                <p style={{ margin: 0, fontSize: "11px", color: "#7a8c9a", lineHeight: 1.5 }}>
                  Seus dados estão protegidos e serão usados apenas para fins de identificação profissional.
                </p>
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
                  letterSpacing: "2px",
                  cursor: carregando ? "not-allowed" : "pointer",
                  marginTop: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  boxShadow: carregando ? "none" : "0 4px 14px rgba(26,107,60,0.30)",
                }}
              >
                {carregando ? "CADASTRANDO..." : <><span>CADASTRAR</span><span>→</span></>}
              </button>

              <div style={{ textAlign: "center", marginTop: "6px", marginBottom: "4px" }}>
                <span style={{ fontSize: "13px", color: "#7a8c9a" }}>
                  Já tem uma conta?{" "}
                  <Link href="/" style={{ color: "#1a6b3c", fontWeight: 600, textDecoration: "none" }}>
                    Entrar
                  </Link>
                </span>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
