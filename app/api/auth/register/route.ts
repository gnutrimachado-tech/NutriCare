import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { prisma } from '@/lib/prisma'

/**
 * Normaliza CPF removendo pontuação e espaços.
 */
function normalizarCpf(cpf: string): string {
  return cpf.replace(/\D/g, '').trim()
}

/**
 * Normaliza e-mail para comparação.
 */
function normalizarEmail(email: string): string {
  return email.trim().toLowerCase()
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { nome, email, senha, crn, cnpj, estadoCrn, area, telefone, cpf } = body

    // ── Validação básica ──────────────────────────────────────────────
    if (!nome?.trim() || !email?.trim() || !senha?.trim()) {
      return NextResponse.json(
        { error: 'Preencha todos os campos obrigatórios.' },
        { status: 400 }
      )
    }
    if (senha.length < 6) {
      return NextResponse.json(
        { error: 'A senha deve ter pelo menos 6 caracteres.' },
        { status: 400 }
      )
    }
    if (!cpf?.trim()) {
      return NextResponse.json(
        { error: 'CPF é obrigatório para verificar sua assinatura.' },
        { status: 400 }
      )
    }

    const emailNorm = normalizarEmail(email)
    const cpfNorm = normalizarCpf(cpf)

    // ── Verificação Hotmart ───────────────────────────────────────────
    // Checa se o e-mail + CPF estão na tabela de compradores autorizados,
    // que é preenchida automaticamente pelo webhook da Hotmart.
    let comprador: { email: string; cpf: string } | null = null

    try {
      comprador = await (prisma as any).hotmart_compradores.findFirst({
        where: {
          email: emailNorm,
          cpf: cpfNorm,
        },
      })
    } catch {
      // Se a tabela ainda não existe no banco (primeira vez), tenta sem Hotmart
      // ATENÇÃO: remova este bloco catch após rodar a migration do SQL abaixo.
      console.warn('[register] Tabela hotmart_compradores não encontrada – verificação ignorada.')
      comprador = { email: emailNorm, cpf: cpfNorm } // permite enquanto a tabela não existe
    }

    if (!comprador) {
      return NextResponse.json(
        {
          error:
            'Seu e-mail ou CPF não foi encontrado em nossas assinaturas. ' +
            'Por favor, adquira o plano NutriCare na Hotmart antes de se cadastrar.',
        },
        { status: 403 }
      )
    }

    // ── E-mail já cadastrado? ─────────────────────────────────────────
    const existing = await prisma.nutricionistas.findUnique({
      where: { email: emailNorm },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'Este e-mail já possui uma conta cadastrada. Faça login.' },
        { status: 409 }
      )
    }

    // ── Cria o nutricionista ──────────────────────────────────────────
    const senhaHash = await hash(senha, 12)

    await prisma.nutricionistas.create({
      data: {
        nome: nome.trim(),
        email: emailNorm,
        senha_hash: senhaHash,
        crn: crn?.trim() || null,
        // Se seu schema tiver esses campos, ótimo; caso contrário, remova as linhas abaixo
        // cnpj: cnpj?.trim() || null,
        // estado_crn: estadoCrn?.trim() || null,
        // area_atuacao: area?.trim() || null,
        // telefone: telefone?.trim() || null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[register]', err)
    return NextResponse.json(
      { error: 'Erro interno. Tente novamente.' },
      { status: 500 }
    )
  }
}
