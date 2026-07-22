"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

type PatientTabKey =
  | "paciente"
  | "anamnese"
  | "antropometria"
  | "gasto-calorico"
  | "plano-alimentar"
  | "envio-plano";

type Props = {
  patientId: string;
  activeTab: PatientTabKey;
};

const TAB_LABELS: Record<PatientTabKey, string> = {
  paciente: "Paciente",
  anamnese: "Anamnese",
  antropometria: "Antropometria",
  "gasto-calorico": "Gasto Calórico",
  "plano-alimentar": "Plano Alimentar",
  "envio-plano": "Envio do Plano",
};

export default function PatientTabsNav({ patientId, activeTab }: Props) {
  const router = useRouter();

  const tabs = useMemo(
    () => [
      { key: "paciente" as const, href: `/pacientes/${patientId}` },
      { key: "anamnese" as const, href: `/pacientes/${patientId}/anamnese` },
      { key: "antropometria" as const, href: `/pacientes/${patientId}/antropometria` },
      { key: "gasto-calorico" as const, href: `/pacientes/${patientId}/gasto-calorico` },
      { key: "plano-alimentar" as const, href: `/pacientes/${patientId}/plano-alimentar` },
      { key: "envio-plano" as const, href: `/pacientes/${patientId}/envio-plano` },
    ],
    [patientId]
  );

  useEffect(() => {
    tabs.forEach((tab) => router.prefetch(tab.href));
  }, [router, tabs]);

  return (
    <nav
      aria-label="Navegação do paciente"
      style={{
        display: "flex",
        justifyContent: "center",
        margin: "0 0 24px 0",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "10px",
          width: "100%",
          maxWidth: "1120px",
          padding: "14px 16px",
          borderRadius: "18px",
          background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
          border: "1px solid #e2e8f0",
          boxShadow: "0 8px 28px rgba(15, 23, 42, 0.06)",
        }}
      >
        {tabs.map((tab) => {
          const active = tab.key === activeTab;
          return (
            <Link
              key={tab.key}
              href={tab.href}
              prefetch
              style={{
                textDecoration: "none",
                padding: "12px 18px",
                borderRadius: "999px",
                fontSize: "14px",
                fontWeight: 700,
                letterSpacing: "0.2px",
                transition: "all 0.2s ease",
                background: active
                  ? "linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)"
                  : "#ffffff",
                color: active ? "#ffffff" : "#334155",
                border: active ? "1px solid #1d4ed8" : "1px solid #dbe3ec",
                boxShadow: active
                  ? "0 10px 24px rgba(37, 99, 235, 0.28)"
                  : "0 2px 8px rgba(15, 23, 42, 0.04)",
              }}
            >
              {TAB_LABELS[tab.key]}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
