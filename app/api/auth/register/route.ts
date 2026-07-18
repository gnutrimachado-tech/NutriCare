import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { prisma } from '@/lib/prisma'

function normalizarCpf(cpf: string): string {
  return cpf.replace(/\D/g, '').trim()
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { nome, email, senha, crn, cnpj, estadoCrn, area, telefone, cpf } = body

    if (!nome?.trim() || !email?.trim() || !senha?.trim()) {
      return NextResponse.json({ error: 'Preencha todos os campos obrigatórios.' }, { status: 400 })
    }
    if (senha.length < 6) {
      return NextResponse.json({ error: 'A senha deve ter pelo menos 6 caracteres.' }, { status: 400 })
    }
    if (!cpf?.trim()) {
      return NextResponse.json({ error: 'CPF é obrigatório para verificar sua assinatura.' }, { status: 400 })
    }

    const emailNorm = email.trim().toLowerCase()
    const cpfNorm = normalizarCpf(cpf)

    // ── Verificação Hotmart ──────────────────────────────────────────────
    // Checa se o e-mail + CPF estão na tabela de compradores autorizados.
    // Essa tabela é preenchida automaticamente pelo webhook da Hotmart.
    let comprador: { email: string; cpf: string } | null = null
    try {
      comprador = await (prisma as any).hotmart_compradores.findFirst({
        where: { email: emailNorm, cpf: cpfNorm },
      })
    } catch {
      // Tabela ainda não existe — rode a migration SQL primeiro.
      // Enquanto não existe, bloqueia qualquer cadastro.
      console.warn('[register] Tabela hotmart_compradores não encontrada. Execute a migration SQL.')
      return NextResponse.json(
        { error: 'Sistema em manutenção. Tente novamente em instantes.' },
        { status: 503 }
      )
    }

    if (!comprador) {
      return NextResponse.json(
        {
          error:
            'Seu e-mail ou CPF não foi encontrado em nossas assinaturas. ' +
            'Por favor, adquira o plano NutriCare na Hotmart antes de criar sua conta.',
        },
        { status: 403 }
      )
    }

    // ── E-mail já cadastrado? ────────────────────────────────────────────
    const existing = await prisma.nutricionistas.findUnique({ where: { email: emailNorm } })
    if (existing) {
      return NextResponse.json({ error: 'Este e-mail já possui uma conta. Faça login.' }, { status: 409 })
    }

    // ── Cria o nutricionista ─────────────────────────────────────────────
    const senhaHash = await hash(senha, 12)
    await prisma.nutricionistas.create({
      data: {
        nome: nome.trim(),
        email: emailNorm,
        senha_hash: senhaHash,
        crn: crn?.trim() || null,
        // Adicione cnpj, telefone, estado_crn, area_atuacao se existirem no seu schema
      },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[register]', err)
    return NextResponse.json({ error: 'Erro interno. Tente novamente.' }, { status: 500 })
  }
}
