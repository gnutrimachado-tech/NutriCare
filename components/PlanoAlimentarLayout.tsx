'use client'

import { useState, useCallback, useRef, useEffect, useId } from 'react'
import { TBCA_FOODS, type TBCAFood } from './tbca-data'

type PlanoAlimentarProps = {
  sexoPaciente: 'Feminino' | 'Masculino'
  nomePaciente?: string
  gastoCaloricoTotal?: number | null
}

// ==================== UNIT CONVERSION FACTORS ====================
const UNIT_FACTORS: Record<string, number> = {
  g: 1,
  ml: 1,
  unid: 50,
  fatias: 30,
  'col. sopa': 15,
  'col. cha': 5,
  porcao: 100,
  xicara: 240,
}

const UNIT_OPTIONS = [
  { value: 'g', label: 'gramas (g)' },
  { value: 'ml', label: 'ml' },
  { value: 'unid', label: 'unidade' },
  { value: 'fatias', label: 'fatias' },
  { value: 'col. sopa', label: 'colher sopa' },
  { value: 'col. cha', label: 'colher chá' },
  { value: 'porcao', label: 'porção caseira' },
  { value: 'xicara', label: 'xícara' },
]

// ==================== DIETARY STRATEGIES ====================
interface Strategy {
  name: string
  prot: number
  carb: number
  fat: number
}

const STRATEGIES: Strategy[] = [
  { name: 'NormoCalorica', prot: 33, carb: 34, fat: 33 },
  { name: 'High Carb + High Protein', prot: 20, carb: 65, fat: 15 },
  { name: 'Dieta 40:40:20', prot: 40, carb: 40, fat: 20 },
  { name: 'Dieta 33:33:33', prot: 33, carb: 33, fat: 33 },
  { name: 'Dieta Keto', prot: 25, carb: 10, fat: 65 },
  { name: 'Dieta Hipocalórica', prot: 35, carb: 45, fat: 20 },
  { name: 'Dieta Low Carb', prot: 40, carb: 15, fat: 45 },
]

// ==================== MICRONUTRIENT IDR ====================
interface MicroIDR {
  name: string
  unit: string
  male: number
  female: number
}

const MICRO_IDR: MicroIDR[] = [
  { name: 'Vitamina A', unit: 'mcg', male: 900, female: 700 },
  { name: 'Vitamina C', unit: 'mg', male: 90, female: 75 },
  { name: 'Ferro', unit: 'mg', male: 8, female: 18 },
  { name: 'Cálcio', unit: 'mg', male: 1000, female: 1000 },
  { name: 'Fibras', unit: 'g', male: 38, female: 25 },
]

const MICRO_EXPANDED: MicroIDR[] = [
  { name: 'Vitamina D', unit: 'mcg', male: 15, female: 15 },
  { name: 'Vitamina E', unit: 'mg', male: 15, female: 15 },
  { name: 'Vitamina K', unit: 'mcg', male: 120, female: 90 },
  { name: 'Vitamina B1', unit: 'mg', male: 1.2, female: 1.1 },
  { name: 'Vitamina B2', unit: 'mg', male: 1.3, female: 1.1 },
  { name: 'Vitamina B3', unit: 'mg', male: 16, female: 14 },
  { name: 'Vitamina B5', unit: 'mg', male: 5, female: 5 },
  { name: 'Vitamina B6', unit: 'mg', male: 1.3, female: 1.3 },
  { name: 'Vitamina B7', unit: 'mcg', male: 30, female: 30 },
  { name: 'Vitamina B9', unit: 'mcg', male: 400, female: 400 },
  { name: 'Vitamina B12', unit: 'mcg', male: 2.4, female: 2.4 },
  { name: 'Magnésio', unit: 'mg', male: 420, female: 320 },
  { name: 'Fósforo', unit: 'mg', male: 700, female: 700 },
  { name: 'Potássio', unit: 'mg', male: 3400, female: 2600 },
  { name: 'Sódio', unit: 'mg', male: 1500, female: 1500 },
  { name: 'Zinco', unit: 'mg', male: 11, female: 8 },
  { name: 'Cobre', unit: 'mcg', male: 900, female: 900 },
  { name: 'Manganês', unit: 'mg', male: 2.3, female: 1.8 },
  { name: 'Selênio', unit: 'mcg', male: 55, female: 55 },
  { name: 'Cromo', unit: 'mcg', male: 35, female: 25 },
  { name: 'Molibdênio', unit: 'mcg', male: 45, female: 45 },
  { name: 'Iodo', unit: 'mcg', male: 150, female: 150 },
]

const MICRO_CADASTRO = [
  'Vitamina A (mcg)', 'Vitamina C (mg)', 'Vitamina D (mcg)', 'Vitamina E (mg)',
  'Vitamina K (mcg)', 'Vitamina B1 (mg)', 'Vitamina B2 (mg)', 'Vitamina B3 (mg)',
  'Vitamina B5 (mg)', 'Vitamina B6 (mg)', 'Vitamina B7 (mcg)', 'Vitamina B9 (mcg)',
  'Vitamina B12 (mcg)', 'Fibras (g)', 'Cálcio (mg)', 'Ferro (mg)',
  'Magnésio (mg)', 'Fósforo (mg)', 'Potássio (mg)', 'Sódio (mg)',
  'Zinco (mg)', 'Cobre (mcg)', 'Manganês (mg)', 'Selênio (mcg)',
  'Cromo (mcg)', 'Molibdênio (mcg)', 'Iodo (mcg)',
]

// ==================== TYPES ====================
interface FoodItem {
  id: string
  name: string
  qty: number
  unit: string
  prot: number
  carb: number
  fat: number
  kcal: number
  baseGrams: number
}

interface SubItem {
  id: string
  name: string
  qty: number
  unit: string
  prot: number
  carb: number
  fat: number
  kcal: number
}

interface Meal {
  id: string
  name: string
  icon: string
  colorClass: string
  time: string
  foods: FoodItem[]
  subs: Record<string, SubItem[]>
  collapsed: boolean
  editing: boolean
}

// ==================== HELPER: calculate macros from TBCA ====================
function calcMacros(food: TBCAFood, qty: number, unit: string) {
  const grams = qty * (UNIT_FACTORS[unit] || 1)
  const factor = grams / 100
  return {
    prot: Math.round(food.p * factor * 10) / 10,
    carb: Math.round(food.c * factor * 10) / 10,
    fat: Math.round(food.l * factor * 10) / 10,
    kcal: Math.round(food.k * factor),
    baseGrams: grams,
  }
}

// ==================== INITIAL MEALS ====================
function createInitialMeals(): Meal[] {
  return [
    {
      id: 'cafe',
      name: 'Café da Manhã',
      icon: '☀️',
      colorClass: 'cafe',
      time: '07:00h',
      foods: [
        { id: 'f1', name: 'Pão integral', qty: 2, unit: 'fatias', prot: 7, carb: 26, fat: 2, kcal: 150, baseGrams: 60 },
        { id: 'f2', name: 'Ovos mexidos', qty: 3, unit: 'unid', prot: 18, carb: 2, fat: 12, kcal: 186, baseGrams: 150 },
        { id: 'f3', name: 'Abacate', qty: 50, unit: 'g', prot: 1, carb: 4, fat: 8, kcal: 85, baseGrams: 50 },
      ],
      subs: {
        f1: [{ id: 's1', name: 'Tapioca (2 unid)', qty: 2, unit: 'unid', prot: 1, carb: 24, fat: 0, kcal: 100 }],
        f2: [
          { id: 's2', name: 'Queijo cottage (60g)', qty: 60, unit: 'g', prot: 7, carb: 2, fat: 3, kcal: 62 },
          { id: 's3', name: 'Peito de peru (4 fatias)', qty: 4, unit: 'fatias', prot: 12, carb: 1, fat: 2, kcal: 70 },
        ],
      },
      collapsed: false,
      editing: false,
    },
    {
      id: 'almoco',
      name: 'Almoço',
      icon: '🥗',
      colorClass: 'almoco',
      time: '12:00h',
      foods: [
        { id: 'f4', name: 'Arroz integral', qty: 150, unit: 'g', prot: 4, carb: 38, fat: 2, kcal: 178, baseGrams: 150 },
        { id: 'f5', name: 'Frango grelhado', qty: 150, unit: 'g', prot: 45, carb: 0, fat: 7, kcal: 248, baseGrams: 150 },
        { id: 'f6', name: 'Brócolis', qty: 100, unit: 'g', prot: 3, carb: 7, fat: 0, kcal: 35, baseGrams: 100 },
        { id: 'f7', name: 'Azeite de oliva', qty: 1, unit: 'col. sopa', prot: 0, carb: 0, fat: 10, kcal: 90, baseGrams: 15 },
      ],
      subs: {
        f4: [{ id: 's4', name: 'Batata doce cozida (200g)', qty: 200, unit: 'g', prot: 3, carb: 40, fat: 0, kcal: 172 }],
        f5: [{ id: 's5', name: 'Tilápia grelhada (180g)', qty: 180, unit: 'g', prot: 39, carb: 0, fat: 5, kcal: 190 }],
      },
      collapsed: false,
      editing: false,
    },
    {
      id: 'lanche',
      name: 'Lanche da Tarde',
      icon: '🍎',
      colorClass: 'lanche',
      time: '15:30h',
      foods: [
        { id: 'f8', name: 'Iogurte natural', qty: 170, unit: 'g', prot: 10, carb: 8, fat: 5, kcal: 120, baseGrams: 170 },
        { id: 'f9', name: 'Granola', qty: 30, unit: 'g', prot: 2, carb: 20, fat: 3, kcal: 115, baseGrams: 30 },
      ],
      subs: {},
      collapsed: false,
      editing: false,
    },
    {
      id: 'jantar',
      name: 'Jantar',
      icon: '🌙',
      colorClass: 'jantar',
      time: '19:00h',
      foods: [
        { id: 'f10', name: 'Salmão grelhado', qty: 150, unit: 'g', prot: 34, carb: 0, fat: 12, kcal: 280, baseGrams: 150 },
        { id: 'f11', name: 'Batata doce', qty: 200, unit: 'g', prot: 3, carb: 40, fat: 0, kcal: 172, baseGrams: 200 },
        { id: 'f12', name: 'Salada verde', qty: 100, unit: 'g', prot: 2, carb: 4, fat: 0, kcal: 22, baseGrams: 100 },
      ],
      subs: {
        f10: [{ id: 's6', name: 'Frango grelhado (180g)', qty: 180, unit: 'g', prot: 54, carb: 0, fat: 8, kcal: 297 }],
      },
      collapsed: false,
      editing: false,
    },
    {
      id: 'ceia',
      name: 'Ceia',
      icon: '🌜',
      colorClass: 'ceia',
      time: '21:30h',
      foods: [
        { id: 'f13', name: 'Chá de camomila', qty: 200, unit: 'ml', prot: 0, carb: 0, fat: 0, kcal: 2, baseGrams: 200 },
        { id: 'f14', name: 'Castanha do Pará', qty: 3, unit: 'unid', prot: 2, carb: 1, fat: 6, kcal: 66, baseGrams: 150 },
      ],
      subs: {},
      collapsed: false,
      editing: false,
    },
  ]
}

// ==================== AUTOCOMPLETE COMPONENT ====================
function TacoAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder,
  style,
}: {
  value: string
  onChange: (v: string) => void
  onSelect: (food: TBCAFood) => void
  placeholder?: string
  style?: React.CSSProperties
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const wrapperRef = useRef<HTMLDivElement>(null)

  const filtered = useCallback(() => {
    const words = query
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 0)
    if (words.length === 0) return TBCA_FOODS.slice(0, 15)
    const results: TBCAFood[] = []
    for (const food of TBCA_FOODS) {
      if (results.length >= 15) break
      const name = food.n.toLowerCase()
      if (words.every((w) => name.includes(w))) results.push(food)
    }
    return results
  }, [query])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={wrapperRef} style={{ position: 'relative', ...style }}>
      <input
        type="text"
        value={value}
        placeholder={placeholder || ''}
        onChange={(e) => {
          onChange(e.target.value)
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => {
          setQuery(value)
          setOpen(true)
        }}
        style={{
          width: '100%',
          padding: '5px 10px',
          border: '1.5px solid #e2e8f0',
          borderRadius: 8,
          fontSize: 12,
          background: '#fff',
          minWidth: 130,
          fontWeight: 500,
        }}
      />
      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: '#fff',
            border: '1.5px solid #e2e8f0',
            borderTop: 'none',
            borderRadius: '0 0 10px 10px',
            maxHeight: 220,
            overflowY: 'auto',
            zIndex: 100,
            boxShadow: '0 8px 25px rgba(0,0,0,0.12)',
          }}
        >
          {filtered().length === 0 ? (
            <div style={{ padding: '8px 12px', fontSize: 12, color: '#a0aec0', fontStyle: 'italic' }}>
              Nenhum alimento encontrado
            </div>
          ) : (
            filtered().map((food, i) => (
              <div
                key={i}
                onMouseDown={() => {
                  onSelect(food)
                  onChange(food.n)
                  setOpen(false)
                }}
                style={{
                  padding: '8px 12px',
                  fontSize: 12,
                  cursor: 'pointer',
                  borderBottom: '1px solid #f7fafc',
                  fontWeight: 500,
                }}
                onMouseEnter={(e) => {
                  ;(e.target as HTMLElement).style.background = 'linear-gradient(135deg, #ebf8ff, #e6fffa)'
                }}
                onMouseLeave={(e) => {
                  ;(e.target as HTMLElement).style.background = 'transparent'
                }}
              >
                {food.n}
                <div style={{ fontSize: 10, color: '#a0aec0', fontWeight: 400 }}>
                  P:{food.p}g · C:{food.c}g · G:{food.l}g · {food.k} kcal / 100g
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ==================== PIE CHART SVG ====================
function PieChart({ prot, carb, fat }: { prot: number; carb: number; fat: number }) {
  const total = prot + carb + fat
  if (total === 0) return null
  const pPct = prot / total
  const cPct = carb / total
  const r = 70
  const cx = 85
  const cy = 85

  function arcPath(startAngle: number, endAngle: number) {
    const start = {
      x: cx + r * Math.cos(startAngle),
      y: cy + r * Math.sin(startAngle),
    }
    const end = {
      x: cx + r * Math.cos(endAngle),
      y: cy + r * Math.sin(endAngle),
    }
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0
    return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y} Z`
  }

  const a1 = -Math.PI / 2
  const a2 = a1 + pPct * 2 * Math.PI
  const a3 = a2 + cPct * 2 * Math.PI
  const a4 = a1 + 2 * Math.PI

  return (
    <svg width="170" height="170" viewBox="0 0 170 170" style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.1))' }}>
      <path d={arcPath(a1, a2)} fill="#3182ce" />
      <path d={arcPath(a2, a3)} fill="#38a169" />
      <path d={arcPath(a3, a4)} fill="#dd6b20" />
      <circle cx={cx} cy={cy} r="45" fill="#fff" />
    </svg>
  )
}

// ==================== MAIN COMPONENT ====================
export default function PlanoAlimentarLayout({
  sexoPaciente,
  nomePaciente: _nomePaciente,
  gastoCaloricoTotal,
}: PlanoAlimentarProps) {
  void _nomePaciente
  const [meals, setMeals] = useState<Meal[]>(createInitialMeals)
  const [strategy, _setStrategy] = useState(3) // Dieta 33:33:33
  const [totalKcal, setTotalKcal] = useState(gastoCaloricoTotal ?? 1850)
  void _setStrategy
  const sex = sexoPaciente
  const [microExpanded, setMicroExpanded] = useState(false)
  const [cadMicroExpanded, setCadMicroExpanded] = useState(false)

  // Cadastrar alimento form
  const [cadNome, setCadNome] = useState('')
  const [cadQty, setCadQty] = useState('100')
  const [cadUnit, setCadUnit] = useState('g')
  const [cadProt, setCadProt] = useState('')
  const [cadCarb, setCadCarb] = useState('')
  const [cadFat, setCadFat] = useState('')
  const [cadKcal, setCadKcal] = useState('')

  // Totals
  const totals = meals.reduce(
    (acc, meal) => {
      for (const f of meal.foods) {
        acc.prot += f.prot
        acc.carb += f.carb
        acc.fat += f.fat
        acc.kcal += f.kcal
      }
      return acc
    },
    { prot: 0, carb: 0, fat: 0, kcal: 0 }
  )

  const strat = STRATEGIES[strategy]
  const metaProt = Math.round((totalKcal * strat.prot) / 100 / 4)
  const metaCarb = Math.round((totalKcal * strat.carb) / 100 / 4)
  const metaFat = Math.round((totalKcal * strat.fat) / 100 / 9)

  // Cadastrar preview
  const cadQtyNum = parseFloat(cadQty) || 0
  const cadProtNum = parseFloat(cadProt) || 0
  const cadCarbNum = parseFloat(cadCarb) || 0
  const cadFatNum = parseFloat(cadFat) || 0
  const cadKcalNum = parseFloat(cadKcal) || 0
  const cadTotalGrams = cadQtyNum * (UNIT_FACTORS[cadUnit] || 1)
  const cadFactor = cadTotalGrams > 0 ? 100 / cadTotalGrams : 0
  const cadShowPreview = cadQtyNum > 0 && (cadProtNum > 0 || cadCarbNum > 0 || cadFatNum > 0 || cadKcalNum > 0)

  // Helpers
  const idPrefix = useId()
  const counterRef = useRef(0)
  const genId = useCallback(() => {
    counterRef.current += 1
    return idPrefix + '_' + counterRef.current
  }, [idPrefix])

  const updateMeal = useCallback((mealId: string, updater: (m: Meal) => Meal) => {
    setMeals((prev) => prev.map((m) => (m.id === mealId ? updater(m) : m)))
  }, [])

  const toggleMeal = (id: string) => updateMeal(id, (m) => ({ ...m, collapsed: !m.collapsed }))

  const editMealName = (id: string) => updateMeal(id, (m) => ({ ...m, editing: true }))

  const saveMealName = (id: string, newName: string) =>
    updateMeal(id, (m) => ({ ...m, name: newName, editing: false }))

  const moveMeal = (id: string, dir: 'up' | 'down') => {
    setMeals((prev) => {
      const idx = prev.findIndex((m) => m.id === id)
      if (idx < 0) return prev
      const next = [...prev]
      if (dir === 'up' && idx > 0) [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
      if (dir === 'down' && idx < next.length - 1) [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]]
      return next
    })
  }

  const copyMeal = (id: string) => {
    setMeals((prev) => {
      const idx = prev.findIndex((m) => m.id === id)
      if (idx < 0) return prev
      const src = prev[idx]
      const newId = genId()
      const clone: Meal = {
        ...src,
        id: newId,
        name: src.name + ' (Cópia)',
        foods: src.foods.map((f) => ({ ...f, id: genId() })),
        subs: {},
        collapsed: false,
        editing: false,
      }
      const next = [...prev]
      next.splice(idx + 1, 0, clone)
      return next
    })
  }

  const deleteMeal = (id: string) => {
    if (typeof window !== 'undefined' && !window.confirm('Excluir esta refeição?')) return
    setMeals((prev) => prev.filter((m) => m.id !== id))
  }

  const addFood = (mealId: string) => {
    const newFood: FoodItem = {
      id: genId(),
      name: '',
      qty: 100,
      unit: 'g',
      prot: 0,
      carb: 0,
      fat: 0,
      kcal: 0,
      baseGrams: 100,
    }
    updateMeal(mealId, (m) => ({ ...m, foods: [...m.foods, newFood] }))
  }

  const updateFood = (mealId: string, foodId: string, updates: Partial<FoodItem>) => {
    updateMeal(mealId, (m) => ({
      ...m,
      foods: m.foods.map((f) => (f.id === foodId ? { ...f, ...updates } : f)),
    }))
  }

  const removeFood = (mealId: string, foodId: string) => {
    updateMeal(mealId, (m) => ({
      ...m,
      foods: m.foods.filter((f) => f.id !== foodId),
      subs: Object.fromEntries(Object.entries(m.subs).filter(([k]) => k !== foodId)),
    }))
  }

  const selectFoodFromTBCA = (mealId: string, foodId: string, food: TBCAFood) => {
    updateMeal(mealId, (m) => {
      const existing = m.foods.find((f) => f.id === foodId)
      if (!existing) return m
      const macros = calcMacros(food, existing.qty, existing.unit)
      return {
        ...m,
        foods: m.foods.map((f) =>
          f.id === foodId ? { ...f, name: food.n, ...macros } : f
        ),
      }
    })
  }

  const updateFoodQty = (mealId: string, foodId: string, qty: number) => {
    updateMeal(mealId, (m) => {
      const existing = m.foods.find((f) => f.id === foodId)
      if (!existing) return m
      const tbcaFood = TBCA_FOODS.find((t) => t.n === existing.name)
      if (tbcaFood) {
        const macros = calcMacros(tbcaFood, qty, existing.unit)
        return {
          ...m,
          foods: m.foods.map((f) => (f.id === foodId ? { ...f, qty, ...macros } : f)),
        }
      }
      return { ...m, foods: m.foods.map((f) => (f.id === foodId ? { ...f, qty } : f)) }
    })
  }

  const updateFoodUnit = (mealId: string, foodId: string, unit: string) => {
    updateMeal(mealId, (m) => {
      const existing = m.foods.find((f) => f.id === foodId)
      if (!existing) return m
      const totalGrams = existing.baseGrams
      const newFactor = UNIT_FACTORS[unit] || 1
      const newQty = Math.round((totalGrams / newFactor) * 10) / 10
      return {
        ...m,
        foods: m.foods.map((f) => (f.id === foodId ? { ...f, unit, qty: newQty } : f)),
      }
    })
  }

  const addSub = (mealId: string, foodId: string) => {
    const newSub: SubItem = {
      id: genId(),
      name: '',
      qty: 100,
      unit: 'g',
      prot: 0,
      carb: 0,
      fat: 0,
      kcal: 0,
    }
    updateMeal(mealId, (m) => ({
      ...m,
      subs: {
        ...m.subs,
        [foodId]: [...(m.subs[foodId] || []), newSub],
      },
    }))
  }

  const updateSub = (mealId: string, foodId: string, subId: string, updates: Partial<SubItem>) => {
    updateMeal(mealId, (m) => ({
      ...m,
      subs: {
        ...m.subs,
        [foodId]: (m.subs[foodId] || []).map((s) =>
          s.id === subId ? { ...s, ...updates } : s
        ),
      },
    }))
  }

  const removeSub = (mealId: string, foodId: string, subId: string) => {
    updateMeal(mealId, (m) => ({
      ...m,
      subs: {
        ...m.subs,
        [foodId]: (m.subs[foodId] || []).filter((s) => s.id !== subId),
      },
    }))
  }

  const cadastrarAlimento = () => {
    if (!cadNome.trim()) {
      alert('Informe o nome do alimento')
      return
    }
    if (cadQtyNum <= 0) {
      alert('Informe a quantidade')
      return
    }
    const newFood: TBCAFood = {
      n: cadNome,
      k: Math.round(cadKcalNum * cadFactor * 10) / 10,
      p: Math.round(cadProtNum * cadFactor * 10) / 10,
      l: Math.round(cadFatNum * cadFactor * 10) / 10,
      c: Math.round(cadCarbNum * cadFactor * 10) / 10,
      f: 0,
      ca: 0,
      fe: 0,
    }
    TBCA_FOODS.push(newFood)
    TBCA_FOODS.sort((a, b) => a.n.localeCompare(b.n))
    alert(
      `Alimento "${cadNome}" cadastrado!\nValores por 100g: P:${newFood.p}g · C:${newFood.c}g · G:${newFood.l}g · ${newFood.k} kcal`
    )
    setCadNome('')
    setCadQty('100')
    setCadProt('')
    setCadCarb('')
    setCadFat('')
    setCadKcal('')
  }

  // ==================== STYLES ====================
  const headerColors: Record<string, { bg: string; border: string }> = {
    cafe: { bg: 'linear-gradient(135deg, #fef9e7, #fdeaa8)', border: '#f7d794' },
    almoco: { bg: 'linear-gradient(135deg, #eafaf1, #b8e994)', border: '#78e08f' },
    lanche: { bg: 'linear-gradient(135deg, #fef0f5, #f8a5c2)', border: '#f78fb3' },
    jantar: { bg: 'linear-gradient(135deg, #eef1f8, #a29bfe)', border: '#6c5ce7' },
    ceia: { bg: 'linear-gradient(135deg, #f5eef8, #d5b8ff)', border: '#a55eea' },
  }

  const getHeaderStyle = (colorClass: string): React.CSSProperties => {
    const colors = headerColors[colorClass] || headerColors.cafe
    return {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '10px 14px',
      borderRadius: '12px 12px 0 0',
      margin: '-16px -16px 12px',
      background: colors.bg,
      borderBottom: `2px solid ${colors.border}`,
    }
  }

  // ==================== RENDER ====================
  return (
    <div style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif", background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e9f0 100%)', color: '#2d3748' }}>
      {/* Main */}
      <div style={{ padding: '20px 24px' }}>

        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 }}>
          {[
            { value: totalKcal.toLocaleString('pt-BR'), sub: 'kcal', label: 'Calorias Totais', bg: 'linear-gradient(135deg, #fc5c65, #eb3b5a)' },
            { value: totals.prot.toString(), sub: 'g', label: 'Proteínas', bg: 'linear-gradient(135deg, #45aaf2, #2d98da)' },
            { value: totals.carb.toString(), sub: 'g', label: 'Carboidratos', bg: 'linear-gradient(135deg, #26de81, #20bf6b)' },
            { value: totals.fat.toString(), sub: 'g', label: 'Gorduras', bg: 'linear-gradient(135deg, #fed330, #f7b731)' },
          ].map((card) => (
            <div
              key={card.label}
              style={{
                padding: '14px 18px',
                borderRadius: 14,
                color: '#fff',
                textAlign: 'center',
                boxShadow: '0 4px 15px rgba(0,0,0,0.12)',
                background: card.bg,
              }}
            >
              <div style={{ fontSize: 26, fontWeight: 800 }}>
                {card.value} <sub style={{ fontSize: 11, fontWeight: 500 }}>{card.sub}</sub>
              </div>
              <div style={{ fontSize: 10, opacity: 0.85, marginTop: 2, fontWeight: 500, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                {card.label}
              </div>
            </div>
          ))}
        </div>

        {/* Content Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16 }}>
          {/* Left Column - Meals */}
          <div>
            {meals.map((meal) => {
              const mealTotals = meal.foods.reduce(
                (acc, f) => ({
                  prot: acc.prot + f.prot,
                  carb: acc.carb + f.carb,
                  fat: acc.fat + f.fat,
                  kcal: acc.kcal + f.kcal,
                }),
                { prot: 0, carb: 0, fat: 0, kcal: 0 }
              )

              return (
                <div
                  key={meal.id}
                  style={{
                    background: '#fff',
                    borderRadius: 14,
                    boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
                    padding: 16,
                    marginBottom: 14,
                    border: '1px solid rgba(0,0,0,0.03)',
                  }}
                >
                  {/* Meal Header */}
                  <div style={getHeaderStyle(meal.colorClass)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                      {meal.editing ? (
                        <input
                          autoFocus
                          defaultValue={meal.name}
                          onBlur={(e) => saveMealName(meal.id, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveMealName(meal.id, (e.target as HTMLInputElement).value)
                          }}
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: '#1a365d',
                            border: '2px solid #63b3ed',
                            borderRadius: 6,
                            padding: '3px 8px',
                            background: '#fff',
                            width: 170,
                            outline: 'none',
                          }}
                        />
                      ) : (
                        <span
                          onDoubleClick={() => editMealName(meal.id)}
                          style={{ fontSize: 14, fontWeight: 700, color: '#1a365d', cursor: 'pointer' }}
                        >
                          {meal.icon} {meal.name}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginLeft: 8 }}>
                      {[
                        { title: 'Editar nome', icon: '✏️', fn: () => editMealName(meal.id) },
                        { title: 'Mover para cima', icon: '⬆️', fn: () => moveMeal(meal.id, 'up') },
                        { title: 'Mover para baixo', icon: '⬇️', fn: () => moveMeal(meal.id, 'down') },
                        { title: 'Copiar refeição', icon: '📋', fn: () => copyMeal(meal.id) },
                        { title: 'Excluir refeição', icon: '🗑️', fn: () => deleteMeal(meal.id) },
                        {
                          title: 'Minimizar/Expandir',
                          icon: meal.collapsed ? '▶' : '▼',
                          fn: () => toggleMeal(meal.id),
                        },
                      ].map((btn) => (
                        <button
                          key={btn.title}
                          title={btn.title}
                          onClick={btn.fn}
                          style={{
                            background: 'rgba(255,255,255,0.5)',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: 12,
                            padding: '4px 6px',
                            borderRadius: 6,
                            color: '#718096',
                          }}
                        >
                          {btn.icon}
                        </button>
                      ))}
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        color: '#718096',
                        fontWeight: 600,
                        background: 'rgba(255,255,255,0.6)',
                        padding: '2px 8px',
                        borderRadius: 10,
                      }}
                    >
                      {meal.time}
                    </span>
                  </div>

                  {/* Meal Body */}
                  {!meal.collapsed && (
                    <div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
                        <thead>
                          <tr>
                            <th style={thStyle}></th>
                            <th style={thStyle}>ALIMENTO</th>
                            <th style={thStyle}>QUANTIDADE</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>PROT</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>CARB</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>GORD</th>
                            <th style={{ ...thStyle, textAlign: 'right' }}>KCAL</th>
                            <th style={thStyle}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {meal.foods.map((food) => (
                            <FoodRow
                              key={food.id}
                              food={food}
                              mealId={meal.id}
                              subs={meal.subs[food.id] || []}
                              onUpdateName={(name) => updateFood(meal.id, food.id, { name })}
                              onSelectTBCA={(tbca) => selectFoodFromTBCA(meal.id, food.id, tbca)}
                              onUpdateQty={(qty) => updateFoodQty(meal.id, food.id, qty)}
                              onUpdateUnit={(unit) => updateFoodUnit(meal.id, food.id, unit)}
                              onRemove={() => removeFood(meal.id, food.id)}
                              onAddSub={() => addSub(meal.id, food.id)}
                              onUpdateSub={(subId, updates) => updateSub(meal.id, food.id, subId, updates)}
                              onRemoveSub={(subId) => removeSub(meal.id, food.id, subId)}
                            />
                          ))}
                        </tbody>
                      </table>

                      {/* Meal Totals */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-around',
                          padding: '10px 0',
                          borderTop: '2px solid #edf2f7',
                          marginTop: 8,
                        }}
                      >
                        {[
                          { label: 'Proteínas', value: `${mealTotals.prot}g` },
                          { label: 'Carboidratos', value: `${mealTotals.carb}g` },
                          { label: 'Gorduras', value: `${mealTotals.fat}g` },
                          { label: 'Calorias', value: `${mealTotals.kcal} kcal` },
                        ].map((t) => (
                          <div key={t.label} style={{ textAlign: 'center' }}>
                            <div style={{ fontWeight: 800, fontSize: 14, color: '#1a365d' }}>{t.value}</div>
                            <div style={{ fontSize: 8, color: '#a0aec0', textTransform: 'uppercase', fontWeight: 700 }}>
                              {t.label}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div style={{ fontSize: 8, color: '#a0aec0', textAlign: 'center', marginTop: 2, fontStyle: 'italic' }}>
                        * Somente alimentos principais contabilizados
                      </div>

                      {/* Add Food Button */}
                      <div
                        onClick={() => addFood(meal.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4,
                          border: '2px dashed #cbd5e0',
                          borderRadius: 10,
                          padding: 10,
                          color: '#a0aec0',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          marginTop: 10,
                        }}
                      >
                        + Adicionar Alimento
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Right Column */}
          <div>
            {/* Quadro 1 - Distribuição de Macronutrientes */}
            <div style={cardStyle}>
              <div style={cardTitleStyle}>📊 Distribuição de Macronutrientes</div>

              {/* Kcal Total editável - referencia gasto calórico */}
              <div style={{ textAlign: 'center', marginBottom: 10, padding: '8px', background: '#f0f9ff', borderRadius: 10, border: '1px solid #bae6fd' }}>
                <div style={{ fontSize: 10, color: '#0369a1', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Kcal Total (Gasto Calórico)
                </div>
                <input
                  type="number"
                  value={totalKcal}
                  onChange={(e) => setTotalKcal(Number(e.target.value) || 0)}
                  style={{
                    width: 100,
                    textAlign: 'center',
                    fontSize: 18,
                    fontWeight: 800,
                    color: '#0c4a6e',
                    border: '2px dashed #7dd3fc',
                    borderRadius: 8,
                    padding: '4px 8px',
                    background: 'rgba(255,255,255,0.8)',
                    outline: 'none',
                  }}
                />
                <div style={{ fontSize: 9, color: '#64748b', marginTop: 2 }}>kcal/dia · Editável</div>
              </div>

              <div style={{ textAlign: 'center', marginBottom: 8 }}>
                <span
                  style={{
                    display: 'inline-block',
                    background: 'linear-gradient(135deg, #ebf8ff, #bee3f8)',
                    color: '#2b6cb0',
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '4px 12px',
                    borderRadius: 20,
                  }}
                >
                  {strat.name}
                </span>
              </div>
              <div style={{ position: 'relative', width: 170, height: 170, margin: '0 auto 10px' }}>
                <PieChart prot={strat.prot} carb={strat.carb} fat={strat.fat} />
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#1a365d' }}>{totalKcal.toLocaleString('pt-BR')}</div>
                  <div style={{ fontSize: 9, color: '#a0aec0' }}>kcal totais</div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 14, fontSize: 10, fontWeight: 500 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#3182ce' }} /> Prot {strat.prot}%
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#38a169' }} /> Carb {strat.carb}%
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#dd6b20' }} /> Gord {strat.fat}%
                </div>
              </div>
            </div>

            {/* Quadro 2 - Progresso vs Estratégia */}
            <div style={cardStyle}>
              <div style={cardTitleStyle}>🎯 Progresso vs Estratégia</div>
              <div style={{ textAlign: 'center', marginBottom: 8 }}>
                <span style={{ display: 'inline-block', background: '#ebf8ff', color: '#2b6cb0', fontSize: 10, fontWeight: 700, padding: '4px 12px', borderRadius: 20 }}>
                  {strat.name} — Meta: {totalKcal.toLocaleString('pt-BR')} kcal
                </span>
              </div>
              {[
                { name: `Proteína (${strat.prot}%)`, current: totals.prot, target: metaProt, color: '#3182ce', gradStart: '#63b3ed', gradEnd: '#3182ce' },
                { name: `Carboidrato (${strat.carb}%)`, current: totals.carb, target: metaCarb, color: '#38a169', gradStart: '#68d391', gradEnd: '#38a169' },
                { name: `Gordura (${strat.fat}%)`, current: totals.fat, target: metaFat, color: '#dd6b20', gradStart: '#f6ad55', gradEnd: '#dd6b20' },
              ].map((macro) => {
                const pct = macro.target > 0 ? Math.round((macro.current / macro.target) * 100) : 0
                const diff = macro.target - macro.current
                return (
                  <div
                    key={macro.name}
                    style={{ marginBottom: 12, padding: '8px 10px', background: '#f7fafc', borderRadius: 10, border: '1px solid #edf2f7' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#1a365d' }}>
                        <span style={{ color: macro.color }}>●</span> {macro.name}
                      </span>
                      <span style={{ fontSize: 10, color: '#718096', fontWeight: 600 }}>
                        {macro.current}g / {macro.target}g
                      </span>
                    </div>
                    <div style={{ height: 10, borderRadius: 5, background: '#edf2f7', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          borderRadius: 5,
                          width: `${Math.min(pct, 100)}%`,
                          background: `linear-gradient(90deg, ${macro.gradStart}, ${macro.gradEnd})`,
                          transition: 'width 0.4s',
                        }}
                      />
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        marginTop: 3,
                        fontWeight: 600,
                        color: diff > 0 ? '#e53e3e' : '#38a169',
                      }}
                    >
                      {diff > 0
                        ? `⬇ Faltam ${diff}g para atingir a meta (${pct}%)`
                        : `⬆ Excedeu ${Math.abs(diff)}g acima da meta (${pct}%)`}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Quadro 3 - Micronutrientes */}
            <div style={cardStyle}>
              <div style={cardTitleStyle}>💊 Micronutrientes</div>
              <div style={{ fontSize: 10, color: '#718096', marginBottom: 8 }}>
                IDR baseada no sexo: <strong>{sex}</strong>
              </div>
              {MICRO_IDR.map((micro) => (
                <div
                  key={micro.name}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '5px 0',
                    borderBottom: '1px solid #f7fafc',
                    fontSize: 11,
                  }}
                >
                  <span style={{ color: '#4a5568', fontWeight: 500 }}>{micro.name}</span>
                  <span style={{ fontWeight: 700, color: '#1a365d' }}>
                    {sex === 'Masculino' ? micro.male : micro.female} {micro.unit}
                  </span>
                </div>
              ))}

              {microExpanded && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#1a365d', margin: '10px 0 6px', textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 4, borderBottom: '2px solid #edf2f7' }}>
                    Vitaminas
                  </div>
                  {MICRO_EXPANDED.filter((m) => m.name.startsWith('Vitamina')).map((micro) => (
                    <div
                      key={micro.name}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '4px 0',
                        borderBottom: '1px solid #f7fafc',
                        fontSize: 11,
                      }}
                    >
                      <span style={{ color: '#4a5568', fontWeight: 500 }}>{micro.name}</span>
                      <span style={{ fontWeight: 700, color: '#1a365d' }}>
                        {sex === 'Masculino' ? micro.male : micro.female} {micro.unit}
                      </span>
                    </div>
                  ))}
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#1a365d', margin: '10px 0 6px', textTransform: 'uppercase', letterSpacing: 0.8, paddingBottom: 4, borderBottom: '2px solid #edf2f7' }}>
                    Minerais
                  </div>
                  {MICRO_EXPANDED.filter((m) => !m.name.startsWith('Vitamina')).map((micro) => (
                    <div
                      key={micro.name}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '4px 0',
                        borderBottom: '1px solid #f7fafc',
                        fontSize: 11,
                      }}
                    >
                      <span style={{ color: '#4a5568', fontWeight: 500 }}>{micro.name}</span>
                      <span style={{ fontWeight: 700, color: '#1a365d' }}>
                        {sex === 'Masculino' ? micro.male : micro.female} {micro.unit}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => setMicroExpanded(!microExpanded)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  color: '#38a169',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: '8px 0',
                  background: 'none',
                  border: 'none',
                }}
              >
                {microExpanded ? '− Micronutrientes' : '+ Micronutrientes'}
              </button>
            </div>

            {/* Quadro 4 - Cadastrar Alimento */}
            <div style={cardStyle}>
              <div style={cardTitleStyle}>➕ Cadastrar Alimento</div>
              <p style={{ fontSize: 10, color: '#718096', marginBottom: 10, lineHeight: 1.4 }}>
                Os valores nutricionais serão convertidos para <strong>por 100g</strong>. Ao usar o alimento no plano, os
                macros serão calculados proporcionalmente à quantidade escolhida.
              </p>

              <div style={{ marginBottom: 10 }}>
                <label style={labelStyle}>Nome do Alimento</label>
                <input
                  type="text"
                  placeholder="Ex: Arroz integral"
                  value={cadNome}
                  onChange={(e) => setCadNome(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={labelStyle}>Quantidade informada</label>
                  <input
                    type="number"
                    placeholder="Ex: 150"
                    value={cadQty}
                    onChange={(e) => setCadQty(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Unidade</label>
                  <select value={cadUnit} onChange={(e) => setCadUnit(e.target.value)} style={inputStyle}>
                    {UNIT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                <div>
                  <label style={labelStyle}>Proteínas (g)</label>
                  <input type="number" placeholder="0" value={cadProt} onChange={(e) => setCadProt(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Carboidratos (g)</label>
                  <input type="number" placeholder="0" value={cadCarb} onChange={(e) => setCadCarb(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Gordura (g)</label>
                  <input type="number" placeholder="0" value={cadFat} onChange={(e) => setCadFat(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Calorias (kcal)</label>
                  <input type="number" placeholder="0" value={cadKcal} onChange={(e) => setCadKcal(e.target.value)} style={inputStyle} />
                </div>
              </div>

              {cadShowPreview && (
                <div
                  style={{
                    marginTop: 8,
                    padding: '6px 10px',
                    background: '#f0fff4',
                    borderRadius: 8,
                    border: '1px solid #c6f6d5',
                    fontSize: 10,
                    color: '#2f855a',
                    fontWeight: 600,
                  }}
                >
                  Valores por 100g: P: {Math.round(cadProtNum * cadFactor * 10) / 10}g · C:{' '}
                  {Math.round(cadCarbNum * cadFactor * 10) / 10}g · G: {Math.round(cadFatNum * cadFactor * 10) / 10}g ·{' '}
                  {Math.round(cadKcalNum * cadFactor * 10) / 10} kcal
                </div>
              )}

              {cadMicroExpanded && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginTop: 8 }}>
                  {MICRO_CADASTRO.map((m) => (
                    <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <label style={{ fontSize: 9, color: '#a0aec0', minWidth: 65, fontWeight: 600 }}>{m}</label>
                      <input
                        type="number"
                        style={{
                          width: 55,
                          padding: '4px 6px',
                          border: '1.5px solid #e2e8f0',
                          borderRadius: 6,
                          fontSize: 10,
                          textAlign: 'center',
                          background: '#fff',
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => setCadMicroExpanded(!cadMicroExpanded)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  color: '#38a169',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: '8px 0',
                  background: 'none',
                  border: 'none',
                  marginTop: 8,
                }}
              >
                {cadMicroExpanded ? '− Micronutrientes' : '+ Micronutrientes'}
              </button>

              <button onClick={cadastrarAlimento} style={btnSaveStyle}>
                Adicionar alimento ao sistema
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ==================== FOOD ROW COMPONENT ====================
function FoodRow({
  food,
  mealId: _mealId,
  subs,
  onUpdateName,
  onSelectTBCA,
  onUpdateQty,
  onUpdateUnit,
  onRemove,
  onAddSub,
  onUpdateSub,
  onRemoveSub,
}: {
  food: FoodItem
  mealId: string
  subs: SubItem[]
  onUpdateName: (name: string) => void
  onSelectTBCA: (food: TBCAFood) => void
  onUpdateQty: (qty: number) => void
  onUpdateUnit: (unit: string) => void
  onRemove: () => void
  onAddSub: () => void
  onUpdateSub: (subId: string, updates: Partial<SubItem>) => void
  onRemoveSub: (subId: string) => void
}) {
  void _mealId
  return (
    <>
      <tr>
        <td style={{ ...tdStyle, fontSize: 9, color: '#4299e1', textTransform: 'uppercase', fontWeight: 700 }}>
          PRINCIPAL
        </td>
        <td style={tdStyle}>
          <TacoAutocomplete
            value={food.name}
            onChange={onUpdateName}
            onSelect={onSelectTBCA}
            style={{ minWidth: 130 }}
          />
        </td>
        <td style={tdStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input
              type="number"
              value={food.qty}
              onChange={(e) => onUpdateQty(parseFloat(e.target.value) || 0)}
              style={{
                width: 50,
                padding: '5px 6px',
                border: '1.5px solid #e2e8f0',
                borderRadius: 8,
                fontSize: 12,
                textAlign: 'center',
                fontWeight: 600,
              }}
            />
            <select
              value={food.unit}
              onChange={(e) => onUpdateUnit(e.target.value)}
              style={{
                padding: '5px 6px',
                border: '1.5px solid #e2e8f0',
                borderRadius: 8,
                fontSize: 10,
                background: '#fff',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              {UNIT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </td>
        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: '#4a5568' }}>{food.prot}g</td>
        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: '#4a5568' }}>{food.carb}g</td>
        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: '#4a5568' }}>{food.fat}g</td>
        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800, color: '#1a365d' }}>{food.kcal}</td>
        <td style={tdStyle}>
          <span onClick={onRemove} style={{ cursor: 'pointer', color: '#cbd5e0', fontSize: 16, padding: '2px 4px' }}>
            ×
          </span>
        </td>
      </tr>

      {/* Substitution rows */}
      {subs.map((sub, idx) => (
        <tr key={sub.id} style={{ background: '#f7fafc' }}>
          <td style={{ ...tdStyle, borderBottom: '1px solid #edf2f7', fontSize: 9, color: '#63b3ed', fontWeight: 600 }}>
            ↳ SUB {idx + 1}
          </td>
          <td style={{ ...tdStyle, borderBottom: '1px solid #edf2f7' }}>
            <TacoAutocomplete
              value={sub.name}
              onChange={(name) => onUpdateSub(sub.id, { name })}
              onSelect={(tbcaFood) => {
                const grams = sub.qty * (UNIT_FACTORS[sub.unit] || 1)
                const factor = grams / 100
                onUpdateSub(sub.id, {
                  name: tbcaFood.n,
                  prot: Math.round(tbcaFood.p * factor * 10) / 10,
                  carb: Math.round(tbcaFood.c * factor * 10) / 10,
                  fat: Math.round(tbcaFood.l * factor * 10) / 10,
                  kcal: Math.round(tbcaFood.k * factor),
                })
              }}
              style={{ minWidth: 120 }}
            />
          </td>
          <td style={{ ...tdStyle, borderBottom: '1px solid #edf2f7' }}>
            <input
              type="number"
              value={sub.qty}
              onChange={(e) => {
                const qty = parseFloat(e.target.value) || 0
                const tbcaFood = TBCA_FOODS.find((t) => t.n === sub.name)
                if (tbcaFood) {
                  const grams = qty * (UNIT_FACTORS[sub.unit] || 1)
                  const factor = grams / 100
                  onUpdateSub(sub.id, {
                    qty,
                    prot: Math.round(tbcaFood.p * factor * 10) / 10,
                    carb: Math.round(tbcaFood.c * factor * 10) / 10,
                    fat: Math.round(tbcaFood.l * factor * 10) / 10,
                    kcal: Math.round(tbcaFood.k * factor),
                  })
                } else {
                  onUpdateSub(sub.id, { qty })
                }
              }}
              style={{
                width: 50,
                padding: '5px 6px',
                border: '1.5px solid #e2e8f0',
                borderRadius: 8,
                fontSize: 12,
                textAlign: 'center',
                fontWeight: 600,
              }}
            />
          </td>
          <td style={{ ...tdStyle, borderBottom: '1px solid #edf2f7', textAlign: 'right', fontWeight: 600, color: '#4a5568', fontSize: 12 }}>{sub.prot}g</td>
          <td style={{ ...tdStyle, borderBottom: '1px solid #edf2f7', textAlign: 'right', fontWeight: 600, color: '#4a5568', fontSize: 12 }}>{sub.carb}g</td>
          <td style={{ ...tdStyle, borderBottom: '1px solid #edf2f7', textAlign: 'right', fontWeight: 600, color: '#4a5568', fontSize: 12 }}>{sub.fat}g</td>
          <td style={{ ...tdStyle, borderBottom: '1px solid #edf2f7', textAlign: 'right', fontWeight: 800, color: '#1a365d', fontSize: 12 }}>{sub.kcal}</td>
          <td style={{ ...tdStyle, borderBottom: '1px solid #edf2f7' }}>
            <span onClick={() => onRemoveSub(sub.id)} style={{ cursor: 'pointer', color: '#e53e3e', fontSize: 16, padding: '2px 4px', fontWeight: 700 }}>
              ×
            </span>
          </td>
        </tr>
      ))}

      {/* Add substitution */}
      <tr style={{ background: '#f7fafc' }}>
        <td colSpan={8} style={{ ...tdStyle, borderBottom: '1px solid #edf2f7' }}>
          <span
            onClick={onAddSub}
            style={{ color: '#63b3ed', fontSize: 10, cursor: 'pointer', fontWeight: 600 }}
          >
            ↳ + Adicionar substituição
          </span>
        </td>
      </tr>
    </>
  )
}

// ==================== SHARED STYLES ====================
const thStyle: React.CSSProperties = {
  textTransform: 'uppercase',
  fontSize: 9,
  color: '#a0aec0',
  fontWeight: 700,
  textAlign: 'left',
  padding: '6px 8px',
  letterSpacing: 0.5,
  borderBottom: '2px solid #edf2f7',
}

const tdStyle: React.CSSProperties = {
  padding: '8px',
  borderBottom: '1px solid #f7fafc',
  verticalAlign: 'middle',
}

const cardStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 14,
  boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
  padding: 16,
  marginBottom: 14,
  border: '1px solid rgba(0,0,0,0.03)',
}

const cardTitleStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  color: '#1a365d',
  marginBottom: 12,
  display: 'flex',
  alignItems: 'center',
  gap: 6,
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 10,
  fontWeight: 700,
  color: '#a0aec0',
  textTransform: 'uppercase',
  marginBottom: 4,
  letterSpacing: 0.5,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  border: '1.5px solid #e2e8f0',
  borderRadius: 8,
  fontSize: 12,
  background: '#fff',
}

const btnSaveStyle: React.CSSProperties = {
  width: '100%',
  padding: 10,
  background: 'linear-gradient(135deg, #38a169, #2f855a)',
  color: '#fff',
  border: 'none',
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
  marginTop: 10,
  boxShadow: '0 2px 8px rgba(56,161,105,0.3)',
}
