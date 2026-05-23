import GastoCaloricoLayout from "@/components/GastoCaloricoLayout";

export default function GastoCaloricoPage() {
  return (
    <div>
      <GastoCaloricoLayout
        sexoPaciente="Masculino"
        idade={28}
        pesoKg={82}
        alturaCm={178}
        percentualGordura={14}
      />
    </div>
  );
}