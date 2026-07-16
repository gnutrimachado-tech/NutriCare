import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { prisma } from '@/lib/prisma'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'gnutrimachado@gmail.com'

function limparCpf(cpf: string): string {
  return cpf.replace(/\D/g, '')
}

function validarCpf(cpf: string): boolean {
  const numeros = limparCpf(cpf)
  if (numeros.length !== 11 || /^(\d)\1{10}$/.test(numeros)) return false

  let soma = 0
  for (let i = 0; i < 9; i++) soma += parseInt(numeros[i]) * (10 - i)
  let resto = (soma * 10) % 11
  if (resto === 10 || resto === 11) resto = 0
  if (resto !== parseInt(numeros[9])) return false

  soma = 0
  for (let i = 0; i < 10; i++) soma += parseInt(numeros[i]) * (11 - i)
  resto = (soma * 10) % 11
  if (resto === 10 || resto === 11) resto = 0
  return resto === parseInt(numeros[10])
}

export async function POST(req: NextRequest) {
  try {
    const { nome, email, senha, telefone, crn, cpf } = await req.json()

    if (!nome || !email || !senha) {
      return NextResponse.json(
        { error: 'Nome, e-mail e senha são obrigatórios.' },
        { status: 400 }
      )
    }

    if (senha.length < 6) {
      return NextResponse.json(
        { error: 'A senha deve ter no mínimo 6 caracteres.' },
        { status: 400 }
      )
    }

    const isAdmin = email.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase().trim()

    // Admin tem acesso livre — pula todas as validações de CPF
    if (!isAdmin) {
      if (!cpf) {
        return NextResponse.json(
          { error: 'CPF é obrigatório.' },
          { status: 400 }
        )
      }

      const cpfLimpo = limparCpf(cpf)

      if (!validarCpf(cpfLimpo)) {
        return NextResponse.json({ error: 'CPF inválido.' }, { status: 400 })
      }

      const cpfPermitido = await (prisma as unknown as {
        cpf_permitidos: {
          findUnique: (args: { where: { cpf: string } }) => Promise<{ cpf: string; usado: boolean | null } | null>
        }
      }).cpf_permitidos.findUnique({ where: { cpf: cpfLimpo } })

      if (!cpfPermitido) {
        return NextResponse.json(
          { error: 'CPF não encontrado. Você precisa assinar o plano antes de criar sua conta.' },
          { status: 403 }
        )
      }

      if (cpfPermitido.usado) {
        return NextResponse.json(
          { error: 'Este CPF já foi utilizado para criar uma conta. Entre em contato com o suporte.' },
          { status: 409 }
        )
      }

      const existing = await prisma.nutricionistas.findUnique({ where: { email } })
      if (existing) {
        return NextResponse.json({ error: 'Este e-mail já está cadastrado.' }, { status: 409 })
      }

      const senha_hash = await hash(senha, 10)

      await prisma.nutricionistas.create({
        data: {
          nome,
          email,
          senha_hash,
          telefone: telefone || null,
          crn: crn || null,
          cpf: cpfLimpo,
        },
      })

      await (prisma as unknown as {
        cpf_permitidos: {
          update: (args: { where: { cpf: string }; data: { usado: boolean } }) => Promise<unknown>
        }
      }).cpf_permitidos.update({
        where: { cpf: cpfLimpo },
        data: { usado: true },
      })

      return NextResponse.json({ ok: true }, { status: 201 })
    }

    // Fluxo do admin — sem validação de CPF
    const existing = await prisma.nutricionistas.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'Este e-mail já está cadastrado.' }, { status: 409 })
    }

    const senha_hash = await hash(senha, 10)
    const cpfLimpo = cpf ? limparCpf(cpf) : null

    await prisma.nutricionistas.create({
      data: {
        nome,
        email,
        senha_hash,
        telefone: telefone || null,
        crn: crn || null,
        cpf: cpfLimpo || null,
      },
    })

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (err) {
    console.error('[CADASTRO]', err)
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
}
