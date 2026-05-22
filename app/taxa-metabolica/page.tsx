'use client'

import { useState, useCallback } from 'react'

// ==================== EXERCISE DATA (internal MET values) ====================
const exercises = [
  { n: 'Aula de Ginástica', m: 4.8 },
  { n: 'Balé', m: 4 },
  { n: 'Basquete', m: 9 },
  { n: 'Bicicleta 1', m: 4 },
  { n: 'Bicicleta 2 (Vigoroso)', m: 10 },
  { n: 'Bicicleta Ergométrica (100W)', m: 5.5 },
  { n: 'Bicicleta Ergométrica (150W)', m: 7 },
  { n: 'Bicicleta Ergométrica (200W)', m: 10.5 },
  { n: 'Bicicleta Ergométrica (50W)', m: 12.5 },
  { n: 'Boliche', m: 3 },
  { n: 'Box Jumps', m: 12 },
  { n: 'Boxe (Saco)', m: 6 },
  { n: 'Boxe (Ringue)', m: 12 },
  { n: 'Burpees', m: 8 },
  { n: 'Caiaque', m: 5 },
  { n: 'Calistenia 1 (Leve)', m: 3.5 },
  { n: 'Calistenia 2 (Vigorosa)', m: 8 },
  { n: 'Caminhada (Baixa)', m: 3.3 },
  { n: 'Caminhada (6 km/h)', m: 5 },
  { n: 'Ciclismo 1', m: 4 },
  { n: 'Ciclismo 2 (18 km/h)', m: 6 },
  { n: 'Ciclismo 3 (25 km/h)', m: 12 },
  { n: 'Corrida (Trote)', m: 10 },
  { n: 'Corrida (8 km/h)', m: 9 },
  { n: 'Corrida (13-14 km/h)', m: 13.5 },
  { n: 'Corrida (Obstáculos)', m: 10 },
  { n: 'Corrida (17.5 km/h)', m: 18 },
  { n: 'Corrida (Intervalada)', m: 6 },
  { n: 'Corrida (12 km/h)', m: 12.5 },
  { n: 'Dançar', m: 4.5 },
  { n: 'Equitação', m: 6.5 },
  { n: 'Escalada', m: 11 },
  { n: 'Futebol', m: 7 },
  { n: 'Futebol Americano', m: 9 },
  { n: 'Golfe em Campo', m: 4.5 },
  { n: 'Handebol', m: 8 },
  { n: 'Hidroginástica', m: 4 },
  { n: 'Jiu Jitsu (Competitivo)', m: 10 },
  { n: 'Jiu Jitsu (Moderado)', m: 6 },
  { n: 'Judô (Competitivo)', m: 10 },
  { n: 'Judô (Moderado)', m: 6 },
  { n: 'Kettlebell Swings', m: 11 },
  { n: 'Musculação (Moderada)', m: 7 },
  { n: 'Musculação (Intensa)', m: 9 },
  { n: 'Natação (Moderada)', m: 6 },
  { n: 'Natação (Intensa)', m: 10 },
  { n: 'Patins In Line', m: 12 },
  { n: 'Polo Aquático', m: 10 },
  { n: 'Pular Corda', m: 10 },
  { n: 'Pular Corda (Intenso)', m: 12 },
  { n: 'Pull Ups', m: 9 },
  { n: 'Rugby', m: 10 },
  { n: 'Sinuca', m: 2.5 },
  { n: 'Skate', m: 5 },
  { n: 'Squash', m: 12 },
  { n: 'Subir Escada (Correndo)', m: 15 },
  { n: 'Surfe', m: 3 },
  { n: 'Tarefas Domésticas', m: 2 },
  { n: 'Tênis', m: 8 },
  { n: 'Treino com Circuito', m: 8 },
  { n: 'Vôlei', m: 6 },
  { n: 'Yoga', m: 2.5 },
]

// ==================== STRATEGIES ====================
interface StrategyCalcResult {
  kcal: [number, number]
  prot?: [number, number]
  protPct?: number
  carb?: [number, number] | string
  carbPct?: [number, number]
  fat?: string
  fatG?: [number, number]
}

interface Strategy {
  key: string
  name: string
  range: string
  desc: string
  mac: [number, number, number]
  calc: (peso: number) => StrategyCalcResult
}

const strategies: Strategy[] = [
  {
    key: 'normo',
    name: 'NormoCalorica',
    range: '30-35 kcal/kg/dia',
    desc: 'Proteínas: 1,5-1,8 g/kg\nCarboidratos: 40-50% kcal\nGorduras: Restante',
    mac: [30, 45, 25],
    calc: (p) => ({
      kcal: [30 * p, 35 * p],
      prot: [1.5 * p, 1.8 * p],
      carbPct: [40, 50],
      fat: 'Restante',
    }),
  },
  {
    key: 'highcarb',
    name: 'High Carb + High Protein',
    range: '40-60 kcal/kg/dia',
    desc: 'Proteínas: 2,5-3,0 g/kg\nCarboidratos: 60-70% kcal\nGorduras: 20%',
    mac: [25, 55, 20],
    calc: (p) => ({
      kcal: [40 * p, 60 * p],
      prot: [2.5 * p, 3.0 * p],
      carbPct: [60, 70],
      fat: '20%',
    }),
  },
  {
    key: '4040',
    name: 'Dieta 40:40:20',
    range: '30-50 kcal/kg/dia',
    desc: 'Proteínas: 40%\nCarboidratos: 40%\nGorduras: 20%',
    mac: [40, 40, 20],
    calc: (p) => ({
      kcal: [30 * p, 50 * p],
      protPct: 40,
      carbPct: [40, 40],
      fat: '20%',
    }),
  },
  {
    key: '3333',
    name: 'Dieta 33:33:33',
    range: '30-40 kcal/kg/dia',
    desc: 'Proteínas: 33%\nCarboidratos: 33%\nGorduras: 33%',
    mac: [33, 33, 34],
    calc: (p) => ({
      kcal: [30 * p, 40 * p],
      protPct: 33,
      carbPct: [33, 33],
      fat: '33%',
    }),
  },
  {
    key: '321',
    name: 'Dieta 3:2:1',
    range: 'Fixo g/kg',
    desc: 'Carboidratos: 3 g/kg\nProteínas: 2 g/kg\nGorduras: 1 g/kg',
    mac: [33, 50, 17],
    calc: (p) => {
      const c = 3 * p
      const pr = 2 * p
      const f = 1 * p
      const t = c * 4 + pr * 4 + f * 9
      return { kcal: [t, t], prot: [pr, pr], carb: [c, c], fatG: [f, f] }
    },
  },
  {
    key: 'keto',
    name: 'Dieta Keto',
    range: '20-35 kcal/kg/dia',
    desc: 'Proteínas: 25% das kcal\nCarboidratos: 10% kcal\nGorduras: Restante (65%)',
    mac: [25, 10, 65],
    calc: (p) => ({
      kcal: [20 * p, 35 * p],
      protPct: 25,
      carbPct: [10, 10],
      fat: 'Restante (65%)',
    }),
  },
  {
    key: 'hipo',
    name: 'Dieta Hipocalórica',
    range: '20-25 kcal/kg/dia',
    desc: 'Proteínas: 2,0 g/kg\nCarboidratos: Restante\nGorduras: 0,8 g/kg',
    mac: [35, 40, 25],
    calc: (p) => ({
      kcal: [20 * p, 25 * p],
      prot: [2 * p, 2 * p],
      carb: 'Restante',
      fatG: [0.8 * p, 0.8 * p],
    }),
  },
  {
    key: 'lowcarb',
    name: 'Dieta Low Carb',
    range: '20-40 kcal/kg/dia',
    desc: 'Proteínas: 2,5-3,0 g/kg\nCarboidratos: 1-2 g/kg\nGorduras: Restante',
    mac: [35, 15, 50],
    calc: (p) => ({
      kcal: [20 * p, 40 * p],
      prot: [2.5 * p, 3 * p],
      carb: [1 * p, 2 * p],
      fat: 'Restante',
    }),
  },
]

// ==================== PROTOCOL FORMULAS ====================
interface Protocol {
  name: string
  html: string
  calc: (s: string, p: number, a: number, i: number, mm: number) => number
  needsMass?: boolean
}

const formulas: Record<string, Protocol> = {
  harris1919: {
    name: 'Harris-Benedict 1919',
    html: '<code>♂ TMB = 66.473 + (13.7516 × Peso) + (5.0033 × Altura) - (6.755 × Idade)</code><br/><code>♀ TMB = 655.0955 + (9.5634 × Peso) + (1.8496 × Altura) - (4.6756 × Idade)</code>',
    calc: (s, p, a, i) =>
      s === 'M'
        ? 66.473 + 13.7516 * p + 5.0033 * a - 6.755 * i
        : 655.0955 + 9.5634 * p + 1.8496 * a - 4.6756 * i,
  },
  harris1984: {
    name: 'Harris-Benedict 1984 (Revisada)',
    html: '<code>♂ TMB = 88.362 + (13.397 × Peso) + (4.799 × Altura) - (5.677 × Idade)</code><br/><code>♀ TMB = 447.593 + (9.247 × Peso) + (3.098 × Altura) - (4.330 × Idade)</code>',
    calc: (s, p, a, i) =>
      s === 'M'
        ? 88.362 + 13.397 * p + 4.799 * a - 5.677 * i
        : 447.593 + 9.247 * p + 3.098 * a - 4.33 * i,
  },
  mifflin: {
    name: 'Mifflin-St Jeor',
    html: '<code>♂ TMB = (10 × Peso) + (6.25 × Altura) - (5 × Idade) + 5</code><br/><code>♀ TMB = (10 × Peso) + (6.25 × Altura) - (5 × Idade) - 161</code>',
    calc: (s, p, a, i) =>
      s === 'M' ? 10 * p + 6.25 * a - 5 * i + 5 : 10 * p + 6.25 * a - 5 * i - 161,
  },
  cunningham: {
    name: 'Cunningham (Massa Magra)',
    html: '<code>TMB = 500 + (22 × Massa Magra)</code><br/><span class="text-red-500 text-xs">Requer Massa Magra</span>',
    calc: (_s, _p, _a, _i, mm) => (mm ? 500 + 22 * mm : 0),
    needsMass: true,
  },
  tinsley_massa: {
    name: 'Tinsley (Massa Magra)',
    html: '<code>TMB = 25.9 × Massa Magra + 284</code><br/><span class="text-red-500 text-xs">Requer Massa Magra</span>',
    calc: (_s, _p, _a, _i, mm) => (mm ? 25.9 * mm + 284 : 0),
    needsMass: true,
  },
  tinsley_peso: {
    name: 'Tinsley (Peso)',
    html: '<code>TMB = 24.8 × Peso + 10</code>',
    calc: (_s, p) => 24.8 * p + 10,
  },
  liu: {
    name: 'Liu',
    html: '<code>♂ TMB = 13.88×P + 4.16×A - 3.43×I - 112.40</code><br/><code>♀ TMB = 9.74×P + 1.80×A - 4.68×I + 667.05</code>',
    calc: (s, p, a, i) =>
      s === 'M'
        ? 13.88 * p + 4.16 * a - 3.43 * i - 112.4
        : 9.74 * p + 1.8 * a - 4.68 * i + 667.05,
  },
  katch: {
    name: 'Katch-McArdle (Massa Magra)',
    html: '<code>TMB = 370 + (21.6 × Massa Magra)</code><br/><span class="text-red-500 text-xs">Requer Massa Magra</span>',
    calc: (_s, _p, _a, _i, mm) => (mm ? 370 + 21.6 * mm : 0),
    needsMass: true,
  },
  oxford: {
    name: 'Oxford Brookes (Henry 2005)',
    html: '<code>♂ 18-30: 14.4×P + 313×A(m) + 113</code><br/><code>♀ 18-30: 10.4×P + 615×A(m) - 282</code><br/><code>♂ 30-60: 11.4×P + 541×A(m) - 137</code><br/><code>♀ 30-60: 8.18×P + 502×A(m) - 11.6</code><br/><code>♂ &gt;60: 11.4×P + 541×A(m) - 256</code><br/><code>♀ &gt;60: 8.52×P + 421×A(m) + 10.7</code>',
    calc: (s, p, a, i) => {
      const am = a / 100
      if (s === 'M') {
        if (i < 18) return 15.6 * p + 266 * am + 299
        if (i < 30) return 14.4 * p + 313 * am + 113
        if (i < 60) return 11.4 * p + 541 * am - 137
        return 11.4 * p + 541 * am - 256
      } else {
        if (i < 18) return 9.4 * p + 249 * am + 462
        if (i < 30) return 10.4 * p + 615 * am - 282
        if (i < 60) return 8.18 * p + 502 * am - 11.6
        return 8.52 * p + 421 * am + 10.7
      }
    },
  },
  fao: {
    name: 'FAO/OMS-2001 (Recomendação Atual)',
    html: '<strong>Equações por faixa etária:</strong><br/><code>♂ 0-3: 60.9×P - 54 | ♀: 61×P - 51</code><br/><code>♂ 3-10: 22.7×P + 495 | ♀: 22.5×P + 499</code><br/><code>♂ 10-18: 17.5×P + 651 | ♀: 12.2×P + 746</code><br/><code>♂ 18-30: 15.3×P + 679 | ♀: 14.7×P + 496</code><br/><code>♂ 30-60: 11.6×P + 879 | ♀: 8.7×P + 829</code><br/><code>♂ &gt;60: 13.5×P + 487 | ♀: 10.5×P + 596</code>',
    calc: (s, p, _a, i) => {
      if (s === 'M') {
        if (i <= 3) return 60.9 * p - 54
        if (i <= 10) return 22.7 * p + 495
        if (i <= 18) return 17.5 * p + 651
        if (i <= 30) return 15.3 * p + 679
        if (i <= 60) return 11.6 * p + 879
        return 13.5 * p + 487
      } else {
        if (i <= 3) return 61 * p - 51
        if (i <= 10) return 22.5 * p + 499
        if (i <= 18) return 12.2 * p + 746
        if (i <= 30) return 14.7 * p + 496
        if (i <= 60) return 8.7 * p + 829
        return 10.5 * p + 596
      }
    },
  },
}

// ==================== HELPERS ====================
function fmt(n: number): string {
  return Math.round(n).toLocaleString('pt-BR')
}

// ==================== TREINO STATE ====================
interface TreinoState {
  exerciseIdx: string
  tempo: number
}

// ==================== COMPONENT ====================
export default function TaxaMetabolicaPage() {
  const [sexo, setSexo] = useState('F')
  const [idade, setIdade] = useState(32)
  const [peso, setPeso] = useState(65)
  const [altura, setAltura] = useState(165)
  const [massaMagra, setMassaMagra] = useState<number | null>(null)
  const [protocolo, setProtocolo] = useState('harris1984')
  const [useFA, setUseFA] = useState(false)
  const [useTreino, setUseTreino] = useState(false)
  const [fatorAtividade, setFatorAtividade] = useState(1.5)
  const [selectedStrat, setSelectedStrat] = useState(0)
  const [treinos, setTreinos] = useState<TreinoState[]>([
    { exerciseIdx: '', tempo: 60 },
  ])
  const [manualCalorie, setManualCalorie] = useState<number | null>(null)

  // Compute TMB
  const tmb = formulas[protocolo].calc(
    sexo,
    peso,
    altura,
    idade,
    massaMagra ?? 0
  )

  // Compute treino kcals
  const treinoKcals = treinos.map((t) => {
    if (t.exerciseIdx === '') return 0
    const met = exercises[parseInt(t.exerciseIdx)].m
    return (met * peso * t.tempo) / 60
  })
  const totalTreino = treinoKcals.reduce((a, b) => a + b, 0)

  // Compute GET
  let get = tmb
  if (useFA) get = tmb * fatorAtividade
  if (useTreino) get += totalTreino

  const caloriaFinal = manualCalorie ?? Math.round(get)

  // Strategy calc
  const computeStrat = useCallback(() => {
    const s = strategies[selectedStrat]
    return s.calc(peso)
  }, [selectedStrat, peso])

  const stratResult = computeStrat()

  const addTreino = () => {
    if (treinos.length < 3) {
      setTreinos([...treinos, { exerciseIdx: '', tempo: 60 }])
    }
  }

  const removeTreino = (idx: number) => {
    setTreinos(treinos.filter((_, i) => i !== idx))
  }

  const updateTreino = (
    idx: number,
    field: keyof TreinoState,
    value: string | number
  ) => {
    const updated = [...treinos]
    if (field === 'exerciseIdx') {
      updated[idx] = { ...updated[idx], exerciseIdx: value as string }
    } else {
      updated[idx] = { ...updated[idx], tempo: value as number }
    }
    setTreinos(updated)
    setManualCalorie(null)
  }

  return (
    <div className="flex min-h-screen bg-[#f0f4f8]">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 w-[170px] h-screen bg-gradient-to-b from-[#1a3a5c] to-[#0d2137] text-white z-10">
        <div className="text-center py-4 border-b border-white/10">
          <h2 className="text-lg font-bold text-[#4fc3f7]">NutriPlan</h2>
          <small className="text-[9px] text-[#90caf9]">
            Sistema de Nutrição
          </small>
        </div>
        <nav className="mt-3">
          {[
            { icon: '📋', label: 'Plano Alimentar' },
            { icon: '🔥', label: 'Taxa Metabólica', active: true },
            { icon: '👥', label: 'Pacientes' },
            { icon: '🍎', label: 'Alimentos' },
            { icon: '📊', label: 'Relatórios' },
            { icon: '📅', label: 'Agenda' },
            { icon: '⚙️', label: 'Configurações' },
          ].map((item) => (
            <a
              key={item.label}
              href="#"
              className={`flex items-center gap-2 px-4 py-2.5 text-xs transition-all ${
                item.active
                  ? 'bg-[#4fc3f7]/15 text-white border-l-3 border-[#4fc3f7]'
                  : 'text-[#b0bec5] hover:bg-[#4fc3f7]/10 hover:text-white'
              }`}
            >
              <span>{item.icon}</span> {item.label}
            </a>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="ml-[170px] p-4 w-full">
        {/* Header */}
        <div className="flex justify-between items-center mb-3">
          <h1 className="text-xl font-bold text-[#1a3a5c]">
            Taxa Metabólica
          </h1>
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-sm">
            <div className="w-8 h-8 rounded-full bg-[#4fc3f7] flex items-center justify-center text-white font-bold text-xs">
              MS
            </div>
            <div>
              <strong className="text-sm text-[#1a3a5c] block leading-tight">
                Maria Silva
              </strong>
              <span className="text-[11px] text-gray-500">
                Feminino · 32 anos · 65kg · 165cm
              </span>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="rounded-xl p-3 text-center text-white bg-gradient-to-br from-[#e74c3c] to-[#c0392b]">
            <div className="text-2xl font-bold">
              {fmt(tmb)}{' '}
              <sub className="text-[11px]">kcal</sub>
            </div>
            <div className="text-[10px] opacity-90">Gasto Calórico (TMB)</div>
          </div>
          <div className="rounded-xl p-3 text-center text-white bg-gradient-to-br from-[#3498db] to-[#2980b9]">
            <div className="text-2xl font-bold">
              {fmt(get)}{' '}
              <sub className="text-[11px]">kcal</sub>
            </div>
            <div className="text-[10px] opacity-90">
              Gasto Energético Total
            </div>
          </div>
          <div className="rounded-xl p-3 text-center text-white bg-gradient-to-br from-[#2ecc71] to-[#27ae60]">
            <div className="text-2xl font-bold">
              {fmt(totalTreino)}{' '}
              <sub className="text-[11px]">kcal</sub>
            </div>
            <div className="text-[10px] opacity-90">Kcal Treinos</div>
          </div>
          <div className="rounded-xl p-3 text-center text-white bg-gradient-to-br from-[#f39c12] to-[#e67e22]">
            <div className="text-2xl font-bold">
              {fatorAtividade.toFixed(2)}
            </div>
            <div className="text-[10px] opacity-90">Fator de Atividade</div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-[1fr_340px] gap-4">
          {/* LEFT / CENTER COLUMN */}
          <div>
            {/* Dados do Paciente */}
            <div className="bg-white rounded-xl shadow-sm p-4 mb-3">
              <h3 className="text-sm font-semibold text-[#1a3a5c] mb-3 flex items-center gap-1.5">
                <span>👤</span> Dados do Paciente
              </h3>
              <div className="grid grid-cols-5 gap-2.5">
                <div>
                  <label className="block text-[10px] font-semibold text-[#7b8a9e] uppercase mb-1 tracking-wider">
                    Sexo
                  </label>
                  <select
                    value={sexo}
                    onChange={(e) => {
                      setSexo(e.target.value)
                      setManualCalorie(null)
                    }}
                    className="w-full px-2.5 py-1.5 border-[1.5px] border-[#dce3ec] rounded-lg text-xs bg-[#fafbfd] focus:border-[#4fc3f7] focus:outline-none"
                  >
                    <option value="M">Masculino</option>
                    <option value="F">Feminino</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-[#7b8a9e] uppercase mb-1 tracking-wider">
                    Idade (anos)
                  </label>
                  <input
                    type="number"
                    value={idade}
                    onChange={(e) => {
                      setIdade(Number(e.target.value))
                      setManualCalorie(null)
                    }}
                    className="w-full px-2.5 py-1.5 border-[1.5px] border-[#dce3ec] rounded-lg text-xs bg-[#fafbfd] focus:border-[#4fc3f7] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-[#7b8a9e] uppercase mb-1 tracking-wider">
                    Peso (kg)
                  </label>
                  <input
                    type="number"
                    value={peso}
                    onChange={(e) => {
                      setPeso(Number(e.target.value))
                      setManualCalorie(null)
                    }}
                    className="w-full px-2.5 py-1.5 border-[1.5px] border-[#dce3ec] rounded-lg text-xs bg-[#fafbfd] focus:border-[#4fc3f7] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-[#7b8a9e] uppercase mb-1 tracking-wider">
                    Altura (cm)
                  </label>
                  <input
                    type="number"
                    value={altura}
                    onChange={(e) => {
                      setAltura(Number(e.target.value))
                      setManualCalorie(null)
                    }}
                    className="w-full px-2.5 py-1.5 border-[1.5px] border-[#dce3ec] rounded-lg text-xs bg-[#fafbfd] focus:border-[#4fc3f7] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-[#7b8a9e] uppercase mb-1 tracking-wider">
                    Massa Magra (kg){' '}
                    <span className="bg-blue-50 text-blue-700 text-[8px] px-1.5 py-0.5 rounded-full font-semibold">
                      opcional
                    </span>
                  </label>
                  <input
                    type="number"
                    value={massaMagra ?? ''}
                    placeholder="Ex: 48"
                    onChange={(e) => {
                      setMassaMagra(
                        e.target.value ? Number(e.target.value) : null
                      )
                      setManualCalorie(null)
                    }}
                    className="w-full px-2.5 py-1.5 border-[1.5px] border-[#dce3ec] rounded-lg text-xs bg-[#fafbfd] focus:border-[#4fc3f7] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Componentes do Cálculo */}
            <div className="bg-white rounded-xl shadow-sm p-4 mb-3">
              <h3 className="text-sm font-semibold text-[#1a3a5c] mb-2 flex items-center gap-1.5">
                <span>🧮</span> Componentes do Cálculo
              </h3>
              <p className="text-[11px] text-[#7b8a9e] mb-2.5">
                O gasto calórico pelo protocolo é sempre calculado. Selecione os
                componentes adicionais:
              </p>
              <div className="flex gap-3 flex-wrap">
                <label
                  className={`flex items-center gap-1.5 px-3 py-1.5 border-2 rounded-lg cursor-pointer text-xs transition-all ${
                    useFA
                      ? 'border-[#4fc3f7] bg-[#e8f7fe]'
                      : 'border-[#e0e7ef]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={useFA}
                    onChange={(e) => {
                      setUseFA(e.target.checked)
                      setManualCalorie(null)
                    }}
                    className="accent-[#4fc3f7] w-3.5 h-3.5"
                  />
                  Fator de Atividade
                </label>
                <label
                  className={`flex items-center gap-1.5 px-3 py-1.5 border-2 rounded-lg cursor-pointer text-xs transition-all ${
                    useTreino
                      ? 'border-[#4fc3f7] bg-[#e8f7fe]'
                      : 'border-[#e0e7ef]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={useTreino}
                    onChange={(e) => {
                      setUseTreino(e.target.checked)
                      setManualCalorie(null)
                    }}
                    className="accent-[#4fc3f7] w-3.5 h-3.5"
                  />
                  Gasto do Treino (MET)
                </label>
              </div>
            </div>

            {/* Treinos (MET) */}
            {useTreino && (
              <div className="bg-white rounded-xl shadow-sm p-4 mb-3">
                <h3 className="text-sm font-semibold text-[#1a3a5c] mb-3 flex items-center gap-1.5">
                  <span>⚡</span> Gasto Energético dos Treinos
                </h3>
                <div className="bg-gradient-to-r from-[#1a3a5c] to-[#2d5a8e] text-white rounded-lg p-2.5 text-center mb-3">
                  <div className="text-xs font-semibold">
                    KCAL = MET × PESO (kg) × TEMPO (min) / 60
                  </div>
                  <div className="text-[9px] opacity-80 mt-0.5">
                    Estimativa de gasto calórico pelo método de METS
                  </div>
                </div>

                {treinos.map((treino, idx) => (
                  <div
                    key={idx}
                    className="border border-[#e0e7ef] rounded-lg p-3 mb-2.5"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[13px] font-semibold text-[#1a3a5c]">
                        🏋️ Treino {idx + 1}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="bg-green-50 text-green-700 text-[9px] px-1.5 py-0.5 rounded-full font-semibold">
                          {fmt(treinoKcals[idx])} kcal
                        </span>
                        {idx > 0 && (
                          <button
                            onClick={() => removeTreino(idx)}
                            className="text-red-500 hover:text-red-700 text-base px-1"
                            title="Remover"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-semibold text-[#7b8a9e] uppercase mb-1">
                          Exercício
                        </label>
                        <select
                          value={treino.exerciseIdx}
                          onChange={(e) =>
                            updateTreino(idx, 'exerciseIdx', e.target.value)
                          }
                          className="w-full px-2.5 py-1.5 border-[1.5px] border-[#dce3ec] rounded-lg text-xs bg-[#fafbfd] focus:border-[#4fc3f7] focus:outline-none"
                        >
                          <option value="">Selecionar...</option>
                          {exercises.map((ex, i) => (
                            <option key={i} value={i}>
                              {ex.n}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-[#7b8a9e] uppercase mb-1">
                          Tempo (min)
                        </label>
                        <input
                          type="number"
                          value={treino.tempo}
                          min={1}
                          onChange={(e) =>
                            updateTreino(idx, 'tempo', Number(e.target.value))
                          }
                          className="w-full px-2.5 py-1.5 border-[1.5px] border-[#dce3ec] rounded-lg text-xs bg-[#fafbfd] focus:border-[#4fc3f7] focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2.5 mt-2">
                      <div className="bg-[#f8fafc] rounded-md p-2 text-center flex-1">
                        <div className="text-lg font-bold text-[#1a3a5c]">
                          {treino.exerciseIdx !== ''
                            ? exercises[parseInt(treino.exerciseIdx)].m
                            : '--'}
                        </div>
                        <div className="text-[9px] text-[#7b8a9e] uppercase">
                          MET
                        </div>
                      </div>
                      <div className="bg-[#f8fafc] rounded-md p-2 text-center flex-1">
                        <div className="text-lg font-bold text-[#1a3a5c]">
                          {treino.exerciseIdx !== ''
                            ? fmt(treinoKcals[idx])
                            : '--'}
                        </div>
                        <div className="text-[9px] text-[#7b8a9e] uppercase">
                          Kcal
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {treinos.length < 3 && (
                  <button
                    onClick={addTreino}
                    className="inline-flex items-center gap-1 bg-[#2ecc71] text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-[#27ae60] transition-colors mt-1"
                  >
                    + Adicionar Treino
                  </button>
                )}

                {/* Resumo treinos */}
                <div className="bg-gradient-to-br from-[#f8fafc] to-[#eef3f9] rounded-lg p-3 mt-3">
                  {treinos.map((_, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between py-1 text-xs border-b border-[#e5eaf0]"
                    >
                      <span className="text-[#7b8a9e]">
                        Kcal Treino {idx + 1}
                      </span>
                      <span className="font-semibold text-[#1a3a5c]">
                        {fmt(treinoKcals[idx])} kcal
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 mt-1 border-t-2 border-[#a5d6a7]">
                    <span className="font-bold text-[#1a3a5c] text-xs">
                      TOTAL TREINOS
                    </span>
                    <span className="font-bold text-[#2e7d32] text-sm">
                      {fmt(totalTreino)} kcal
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Detalhamento */}
            <div className="bg-white rounded-xl shadow-sm p-4 mb-3">
              <h3 className="text-sm font-semibold text-[#1a3a5c] mb-3 flex items-center gap-1.5">
                <span>📊</span> Detalhamento do Cálculo
              </h3>
              <div className="bg-gradient-to-br from-[#e3f2fd] to-[#bbdefb] rounded-lg p-3">
                <div className="flex justify-between py-1 text-xs border-b border-[#e5eaf0]">
                  <span className="text-[#7b8a9e]">Protocolo utilizado</span>
                  <span className="font-semibold text-[#1a3a5c]">
                    {formulas[protocolo].name}
                  </span>
                </div>
                <div className="flex justify-between py-1 text-xs border-b border-[#e5eaf0]">
                  <span className="text-[#7b8a9e]">
                    Gasto Calórico (TMB)
                  </span>
                  <span className="font-semibold text-[#1a3a5c]">
                    {fmt(tmb)} kcal
                  </span>
                </div>
                {useFA && (
                  <div className="flex justify-between py-1 text-xs border-b border-[#e5eaf0]">
                    <span className="text-[#7b8a9e]">
                      × Fator de Atividade
                    </span>
                    <span className="font-semibold text-[#1a3a5c]">
                      {fatorAtividade.toFixed(2)}
                    </span>
                  </div>
                )}
                {useTreino && (
                  <div className="flex justify-between py-1 text-xs border-b border-[#e5eaf0]">
                    <span className="text-[#7b8a9e]">
                      + Gasto Treinos (MET)
                    </span>
                    <span className="font-semibold text-[#1a3a5c]">
                      {fmt(totalTreino)} kcal
                    </span>
                  </div>
                )}
                <div className="flex justify-between pt-2 mt-1 border-t-2 border-[#90caf9]">
                  <span className="font-bold text-[#1a3a5c] text-[13px]">
                    GASTO ENERGÉTICO TOTAL
                  </span>
                  <span className="font-bold text-[#1976d2] text-lg">
                    {fmt(get)} kcal
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN (3 Quadros) */}
          <div>
            {/* QUADRO 1: Protocolos */}
            <div className="bg-white rounded-xl shadow-sm p-4 mb-3">
              <h3 className="text-sm font-semibold text-[#1a3a5c] mb-3 flex items-center gap-1.5">
                <span>📐</span> Protocolo de Gasto Calórico
              </h3>
              <div className="mb-2">
                <label className="block text-[10px] font-semibold text-[#7b8a9e] uppercase mb-1">
                  Selecione o Protocolo
                </label>
                <select
                  value={protocolo}
                  onChange={(e) => {
                    setProtocolo(e.target.value)
                    setManualCalorie(null)
                  }}
                  className="w-full px-2.5 py-1.5 border-[1.5px] border-[#dce3ec] rounded-lg text-[11px] bg-[#fafbfd] focus:border-[#4fc3f7] focus:outline-none"
                >
                  <option value="harris1919">Harris-Benedict 1919</option>
                  <option value="harris1984">Harris-Benedict 1984</option>
                  <option value="mifflin">Mifflin-St Jeor</option>
                  <option value="cunningham">
                    Cunningham (Massa Magra)
                  </option>
                  <option value="tinsley_massa">
                    Tinsley (Massa Magra)
                  </option>
                  <option value="tinsley_peso">Tinsley (Peso)</option>
                  <option value="liu">Liu</option>
                  <option value="katch">
                    Katch-McArdle (Massa Magra)
                  </option>
                  <option value="oxford">
                    Oxford Brookes Basal Metabolic
                  </option>
                  <option value="fao">
                    FAO/OMS (Recomendação Atual)
                  </option>
                </select>
              </div>
              <div
                className="bg-[#f0f4f8] border-l-[3px] border-[#4fc3f7] py-2 px-3 rounded-r-md text-[10px] text-gray-600 leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: `<strong>${formulas[protocolo].name}</strong><br/>${formulas[protocolo].html}`,
                }}
              />
              <div className="bg-gradient-to-br from-[#f8fafc] to-[#eef3f9] rounded-lg p-3 mt-2">
                <div className="flex justify-between text-[13px]">
                  <span className="text-[#7b8a9e] font-semibold">
                    Gasto Calórico (TMB)
                  </span>
                  <span className="text-base font-bold text-[#e74c3c]">
                    {fmt(tmb)} kcal
                  </span>
                </div>
              </div>
            </div>

            {/* QUADRO 2: Estratégias Dietéticas */}
            <div className="bg-white rounded-xl shadow-sm p-4 mb-3">
              <h3 className="text-sm font-semibold text-[#1a3a5c] mb-1 flex items-center gap-1.5">
                <span>🥗</span> Estratégia Dietética
              </h3>
              <p className="text-[10px] text-[#7b8a9e] mb-1.5">
                Aplicada sobre o valor final da caloria
              </p>
              <ul className="max-h-[200px] overflow-y-auto">
                {strategies.map((s, i) => (
                  <li
                    key={s.key}
                    onClick={() => setSelectedStrat(i)}
                    className={`flex justify-between items-center px-2.5 py-2 border-b border-[#f0f2f5] cursor-pointer text-[11px] transition-colors ${
                      selectedStrat === i
                        ? 'bg-[#e8f7fe] border-l-[3px] border-l-[#4fc3f7]'
                        : 'hover:bg-[#f0f9ff]'
                    }`}
                  >
                    <span className="font-semibold text-[#1a3a5c]">
                      {s.name}
                    </span>
                    <span className="text-[#7b8a9e] text-[10px]">
                      {s.range}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="bg-[#f8fafc] rounded-md p-2.5 mt-2 text-[11px] text-gray-600 leading-relaxed whitespace-pre-line">
                {strategies[selectedStrat].desc}
              </div>
              {/* Macro bar */}
              <div className="flex h-4 rounded-lg overflow-hidden my-1.5">
                <div
                  className="flex items-center justify-center text-[8px] text-white font-semibold bg-[#3498db]"
                  style={{
                    width: `${strategies[selectedStrat].mac[0]}%`,
                  }}
                >
                  {strategies[selectedStrat].mac[0]}% P
                </div>
                <div
                  className="flex items-center justify-center text-[8px] text-white font-semibold bg-[#2ecc71]"
                  style={{
                    width: `${strategies[selectedStrat].mac[1]}%`,
                  }}
                >
                  {strategies[selectedStrat].mac[1]}% C
                </div>
                <div
                  className="flex items-center justify-center text-[8px] text-white font-semibold bg-[#f39c12]"
                  style={{
                    width: `${strategies[selectedStrat].mac[2]}%`,
                  }}
                >
                  {strategies[selectedStrat].mac[2]}% G
                </div>
              </div>
              {/* Strategy calculations */}
              <div className="bg-gradient-to-br from-[#f8fafc] to-[#eef3f9] rounded-lg p-3">
                <div className="flex justify-between py-1 text-xs border-b border-[#e5eaf0]">
                  <span className="text-[#7b8a9e]">Kcal/dia</span>
                  <span className="font-semibold text-[#1a3a5c]">
                    {fmt(stratResult.kcal[0])} - {fmt(stratResult.kcal[1])}{' '}
                    kcal
                  </span>
                </div>
                <div className="flex justify-between py-1 text-xs border-b border-[#e5eaf0]">
                  <span className="text-[#7b8a9e]">Proteínas</span>
                  <span className="font-semibold text-[#1a3a5c]">
                    {stratResult.prot
                      ? `${fmt(stratResult.prot[0])} - ${fmt(stratResult.prot[1])} g`
                      : stratResult.protPct
                        ? `${fmt((stratResult.kcal[0] * stratResult.protPct) / 100 / 4)} - ${fmt((stratResult.kcal[1] * stratResult.protPct) / 100 / 4)} g (${stratResult.protPct}%)`
                        : '--'}
                  </span>
                </div>
                <div className="flex justify-between py-1 text-xs border-b border-[#e5eaf0]">
                  <span className="text-[#7b8a9e]">Carboidratos</span>
                  <span className="font-semibold text-[#1a3a5c]">
                    {typeof stratResult.carb === 'string'
                      ? stratResult.carb
                      : Array.isArray(stratResult.carb)
                        ? `${fmt(stratResult.carb[0])} - ${fmt(stratResult.carb[1])} g`
                        : stratResult.carbPct
                          ? `${fmt((stratResult.kcal[0] * stratResult.carbPct[0]) / 100 / 4)} - ${fmt((stratResult.kcal[1] * stratResult.carbPct[1]) / 100 / 4)} g`
                          : '--'}
                  </span>
                </div>
                <div className="flex justify-between py-1 text-xs">
                  <span className="text-[#7b8a9e]">Gorduras</span>
                  <span className="font-semibold text-[#1a3a5c]">
                    {stratResult.fat
                      ? stratResult.fat
                      : stratResult.fatG
                        ? `${fmt(stratResult.fatG[0])} - ${fmt(stratResult.fatG[1])} g`
                        : '--'}
                  </span>
                </div>
              </div>
            </div>

            {/* QUADRO 3: Fator de Atividade + Caloria Final */}
            <div className="bg-white rounded-xl shadow-sm p-4 mb-3">
              <h3 className="text-sm font-semibold text-[#1a3a5c] mb-3 flex items-center gap-1.5">
                <span>🏃</span> Fator de Atividade Física
              </h3>
              <div className="mb-2">
                <label className="block text-[10px] font-semibold text-[#7b8a9e] uppercase mb-1">
                  Nível de Atividade
                </label>
                <select
                  value={fatorAtividade}
                  onChange={(e) => {
                    setFatorAtividade(Number(e.target.value))
                    setManualCalorie(null)
                  }}
                  className="w-full px-2.5 py-1.5 border-[1.5px] border-[#dce3ec] rounded-lg text-[11px] bg-[#fafbfd] focus:border-[#4fc3f7] focus:outline-none"
                >
                  <option value={1.2}>Sedentário (1.0 - 1.39)</option>
                  <option value={1.5}>Pouco Ativo (1.4 - 1.59)</option>
                  <option value={1.725}>Ativo (1.6 - 1.89)</option>
                  <option value={2.2}>Muito Ativo (1.9 - 2.5)</option>
                </select>
              </div>
              <table className="w-full border-collapse text-[10px] mt-1.5">
                <thead>
                  <tr>
                    <th className="bg-[#f0f4f8] text-[#1a3a5c] font-semibold p-1 border border-[#e0e7ef] text-center">
                      Nível
                    </th>
                    <th className="bg-[#f0f4f8] text-[#1a3a5c] font-semibold p-1 border border-[#e0e7ef] text-center">
                      FA
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Sedentário', '1.0 - 1.39'],
                    ['Pouco Ativo', '1.4 - 1.59'],
                    ['Ativo', '1.6 - 1.89'],
                    ['Muito Ativo', '1.9 - 2.5'],
                  ].map(([nivel, fa]) => (
                    <tr key={nivel}>
                      <td className="p-1 border border-[#e0e7ef] text-center">
                        {nivel}
                      </td>
                      <td className="p-1 border border-[#e0e7ef] text-center">
                        {fa}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Valor Final da Caloria */}
            <div className="bg-gradient-to-br from-[#e3f2fd] to-[#bbdefb] rounded-xl p-4 text-center">
              <div className="text-[10px] text-[#1976d2] uppercase font-semibold tracking-wide">
                Caloria Final para o Plano
              </div>
              <div className="mt-1.5">
                <input
                  type="number"
                  value={caloriaFinal}
                  onChange={(e) =>
                    setManualCalorie(Number(e.target.value))
                  }
                  className="w-[120px] text-center text-lg font-bold text-[#1565c0] border-2 border-dashed border-[#90caf9] rounded-lg p-1.5 bg-white/70 focus:border-solid focus:border-[#1976d2] focus:outline-none"
                />
              </div>
              <div className="text-[9px] text-[#7b8a9e] mt-1">
                kcal/dia · Editável pelo nutricionista
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
