// TBCA - Tabela Brasileira de Composição de Alimentos
// Banco de alimentos removido a pedido do nutricionista.
// Uma nova tabela brasileira de alimentos será fornecida e inserida aqui.
// A estrutura (TBCAFood) é mantida para que o restante do sistema continue compilando.

export interface TBCAFood {
  n: string  // nome
  k: number  // kcal
  p: number  // proteína
  l: number  // lipídios (gordura)
  c: number  // carboidratos
  f: number  // fibras
  ca: number // cálcio
  fe: number // ferro
}

export const TBCA_FOODS: TBCAFood[] = []
