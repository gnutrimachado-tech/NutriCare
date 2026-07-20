import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  try {
    const { token, novaSenha } = await req.json()

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token inválido.' }, { status: 400 })
    }
    if (!novaSenha || novaSenha.length < 6) {
      return NextResponse.json({ error: 'A senha deve ter pelo menos 6 caracteres.' }, { status: 400 })
    }

    // Busca o token no banco
    const registro = await prisma.password_reset_tokens.findFirst({
      where: { token },
    })

    if (!registro) {
      return NextResponse.json(
        { error: 'Link inválido ou já utilizado. Solicite um novo link.' },
        { status: 400 }
      )
    }

    // Verifica se expirou (1 hora)
    if (new Date() > new Date(registro.expira_em)) {
      await prisma.password_reset_tokens.delete({ where: { id: registro.id } })
      return NextResponse.json(
        { error: 'Este link expirou. Solicite um novo link de redefinição.' },
        { status: 400 }
      )
    }

    // Verifica se o nutricionista existe (tabela correta)
    const nutricionista = await prisma.nutricionistas.findUnique({
      where: { email: registro.email },
    })

    if (!nutricionista) {
      return NextResponse.json(
        { error: 'Usuário não encontrado.' },
        { status: 404 }
      )
    }

    // Gera hash da nova senha com custo 12 (seguro)
    const hash = await bcrypt.hash(novaSenha, 12)

    // Atualiza a senha do nutricionista (campo correto: senha_hash)
    await prisma.nutricionistas.update({
      where: { email: registro.email },
      data: { senha_hash: hash },
    })

    // Remove o token (uso único)
    await prisma.password_reset_tokens.delete({ where: { id: registro.id } })

    return NextResponse.json({ ok: true, message: 'Senha redefinida com sucesso.' })
  } catch (err) {
    console.error('[reset-password]', err)
    return NextResponse.json(
      { error: 'Erro interno. Tente novamente em alguns instantes.' },
      { status: 500 }
    )
  }
}
