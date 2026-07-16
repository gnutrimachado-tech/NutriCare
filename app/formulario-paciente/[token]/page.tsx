"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";

const CAMPO_LABELS: Record<string, string> = {
  peso: "Peso (kg)",
  altura: "Altura (cm)",
  percentual_gordura: "% Gordura",
  massa_muscular: "Massa Muscular (kg)",
  massa_adiposa: "Massa Adiposa (kg)",
  agua_corporal: "Água Corporal (%)",
  historico_clinico: "Histórico Clínico",
  alergias: "Alergias",
  medicamentos: "Medicamentos",
  suplementos: "Suplementos",
  habitos_alimentares: "Hábitos Alimentares",
  observacoes: "Observações",
};

const NUMERICOS = ["peso", "altura", "percentual_gordura", "massa_muscular", "massa_adiposa", "agua_corporal"];

export default function FormularioPacientePage() {
  const params = useParams();
  const token = params.token as string;

  const [estado, setEstado] = useState<"carregando" | "pronto" | "respondido" | "expirado" | "invalido" | "erro">("carregando");
  const [campos, setCampos] = useState<string[]>([]);
  const [pacienteNome, setPacienteNome] = useState("");
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    async function carregarFormulario() {
      try {
        const res = await fetch(`/api/anamnese/formulario-resposta?token=${token}`);
        const data = await res.json();
        if (res.status === 404) { setEstado("invalido"); return; }
        if (res.status === 410) { setEstado("expirado"); return; }
        if (!res.ok) { setEstado("erro"); return; }
        if (data.status === "respondido") { setEstado("respondido"); return; }
        setCampos(data.campos || []);
        setPacienteNome(data.pacienteNome || "");
        setEstado("pronto");
      } catch {
        setEstado("erro");
      }
    }
    carregarFormulario();
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    try {
      const res = await fetch("/api/anamnese/formulario-resposta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, respostas }),
      });
      const data = await res.json();
      if (res.ok) {
        setSucesso(true);
        setEstado("respondido");
      } else {
        alert(data.error || "Erro ao enviar respostas.");
      }
    } catch {
      alert("Erro de conexão.");
    } finally {
      setEnviando(false);
    }
  }

  const containerStyle: React.CSSProperties = {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #f5faf6 0%, #eaf4ee 40%, #f2f8f4 70%, #fafcf7 100%)",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    padding: "40px 20px",
  };

  const cardStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.97)",
    borderRadius: "24px",
    width: "100%",
    maxWidth: "560px",
    boxShadow: "0 24px 64px rgba(0,0,0,0.09)",
    overflow: "hidden",
  };

  const headerStyle: React.CSSProperties = {
    background: "linear-gradient(135deg, #1a6b3c 0%, #145530 100%)",
    padding: "28px 36px",
    textAlign: "center",
  };

  if (estado === "carregando") {
    return (
      <div style={containerStyle}>
        <div style={{ ...cardStyle, padding: "60px 40px", textAlign: "center" }}>
          <div style={{ fontSize: "40px", marginBottom: "16px" }}>⏳</div>
          <p style={{ color: "#475569", fontSize: "16px" }}>Carregando formulário...</p>
        </div>
      </div>
    );
  }

  if (estado === "invalido") {
    return (
      <div style={containerStyle}>
        <div style={{ ...cardStyle, padding: "60px 40px", textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>❌</div>
          <h2 style={{ color: "#dc2626", marginBottom: "8px" }}>Link inválido</h2>
          <p style={{ color: "#64748b" }}>Este link não existe ou foi removido.</p>
        </div>
      </div>
    );
  }

  if (estado === "expirado") {
    return (
      <div style={containerStyle}>
        <div style={{ ...cardStyle, padding: "60px 40px", textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>⏰</div>
          <h2 style={{ color: "#d97706", marginBottom: "8px" }}>Link expirado</h2>
          <p style={{ color: "#64748b" }}>Este link expirou. Peça ao seu nutricionista para reenviar o formulário.</p>
        </div>
      </div>
    );
  }

  if (estado === "respondido" || sucesso) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={headerStyle}>
            <Image src="/logo-nutricare.png" alt="NutriCare" width={80} height={80} style={{ objectFit: "contain" }} />
            <p style={{ color: "rgba(255,255,255,0.8)", margin: "6px 0 0", fontSize: "11px", letterSpacing: "2px" }}>CIÊNCIA · NUTRIÇÃO · BEM-ESTAR</p>
          </div>
          <div style={{ padding: "48px 40px", textAlign: "center" }}>
            <div style={{ fontSize: "56px", marginBottom: "16px" }}>✅</div>
            <h2 style={{ color: "#1a4d2e", marginBottom: "8px" }}>Respostas enviadas!</h2>
            <p style={{ color: "#64748b", lineHeight: 1.6 }}>
              Obrigado por preencher o formulário. Seu nutricionista já pode visualizar suas respostas.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={headerStyle}>
          <Image src="/logo-nutricare.png" alt="NutriCare" width={80} height={80} style={{ objectFit: "contain" }} />
          <p style={{ color: "rgba(255,255,255,0.8)", margin: "6px 0 0", fontSize: "11px", letterSpacing: "2px" }}>CIÊNCIA · NUTRIÇÃO · BEM-ESTAR</p>
        </div>

        <div style={{ padding: "32px 36px 40px" }}>
          <div style={{ marginBottom: "28px" }}>
            <h2 style={{ margin: "0 0 6px", color: "#1a4d2e", fontSize: "20px" }}>
              Formulário de Anamnese
            </h2>
            {pacienteNome && (
              <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>
                Olá, <strong>{pacienteNome.split(" ")[0]}</strong>! Preencha os campos abaixo.
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            {campos.map((campo) => {
              const label = CAMPO_LABELS[campo] || campo;
              const isNumerico = NUMERICOS.includes(campo);
              return (
                <div key={campo}>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>
                    {label}
                  </label>
                  {isNumerico ? (
                    <input
                      type="text"
                      placeholder={`Digite ${label.toLowerCase()}`}
                      value={respostas[campo] || ""}
                      onChange={(e) => setRespostas((prev) => ({ ...prev, [campo]: e.target.value }))}
                      style={{
                        width: "100%",
                        padding: "11px 14px",
                        border: "1.5px solid #e2e8f0",
                        borderRadius: "10px",
                        fontSize: "14px",
                        outline: "none",
                        boxSizing: "border-box",
                        background: "#fafcfd",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "#1a6b3c")}
                      onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                    />
                  ) : (
                    <textarea
                      rows={3}
                      placeholder={`Descreva ${label.toLowerCase()}`}
                      value={respostas[campo] || ""}
                      onChange={(e) => setRespostas((prev) => ({ ...prev, [campo]: e.target.value }))}
                      style={{
                        width: "100%",
                        padding: "11px 14px",
                        border: "1.5px solid #e2e8f0",
                        borderRadius: "10px",
                        fontSize: "14px",
                        outline: "none",
                        boxSizing: "border-box",
                        background: "#fafcfd",
                        resize: "vertical",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "#1a6b3c")}
                      onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                    />
                  )}
                </div>
              );
            })}

            <button
              type="submit"
              disabled={enviando}
              style={{
                width: "100%",
                padding: "14px",
                background: enviando
                  ? "#94a3b8"
                  : "linear-gradient(135deg, #1a6b3c 0%, #145530 100%)",
                color: "white",
                border: "none",
                borderRadius: "12px",
                fontSize: "14px",
                fontWeight: 700,
                letterSpacing: "1.5px",
                cursor: enviando ? "not-allowed" : "pointer",
                marginTop: "8px",
                boxShadow: enviando ? "none" : "0 4px 14px rgba(26,107,60,0.30)",
              }}
            >
              {enviando ? "ENVIANDO..." : "ENVIAR RESPOSTAS"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
