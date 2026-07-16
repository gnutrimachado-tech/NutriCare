import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

function limparCpf(cpf: string): string {
  return (cpf || '').replace(/\D/g, '')
}

function verificarAssinatura(body: string, hotmartToken: string, receivedSignature: string): boolean {
  const hmac = crypto.createHmac('sha256', hotmartToken)
  hmac.update(body)
  const expected = hmac.digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(receivedSignature, 'hex'))
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    const hotmartToken = process.env.HOTMART_WEBHOOK_TOKEN || ''

    if (hotmartToken) {
      const signature = req.headers.get('x-hotmart-signature') || req.headers.get('x-hub-signature') || ''
      const sigValue = signature.replace(/^sha256=/, '')
      if (!verificarAssinatura(rawBody, hotmartToken, sigValue)) {
        console.error('[HOTMART] Assinatura inválida')
        return NextResponse.json({ error: 'Assinatura inválida' }, { status: 401 })
      }
    }

    const payload = JSON.parse(rawBody)

    const event = payload.event || payload.data?.event || ''

    const aprovados = [
      'PURCHASE_APPROVED',
      'PURCHASE_COMPLETE',
      'RECURRENCE_PAID',
      'SUBSCRIPTION_ACTIVE',
    ]

    if (!aprovados.includes(event)) {
      return NextResponse.json({ ok: true, message: `Evento ${event} ignorado` })
    }

    const buyer = payload.data?.buyer || payload.buyer || {}
    const cpfRaw: string =
      buyer.document ||
      buyer.cpf ||
      payload.data?.purchase?.buyer_document ||
      ''

    const cpf = limparCpf(cpfRaw)
    const email: string = buyer.email || ''
    const nome: string = buyer.name || ''

    if (!cpf || cpf.length !== 11) {
      console.warn('[HOTMART] CPF ausente ou inválido no payload:', cpfRaw)
      return NextResponse.json({ ok: true, message: 'CPF não fornecido pelo Hotmart' })
    }

    await (prisma as unknown as {
      cpf_permitidos: {
        upsert: (args: {
          where: { cpf: string }
          update: { email?: string; nome?: string }
          create: { cpf: string; email: string; nome: string; usado: boolean }
        }) => Promise<unknown>
      }
    }).cpf_permitidos.upsert({
      where: { cpf },
      update: {
        email: email || undefined,
        nome: nome || undefined,
      },
      create: {
        cpf,
        email,
        nome,
        usado: false,
      },
    })

    console.log(`[HOTMART] CPF ${cpf} liberado para cadastro`)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[HOTMART] Erro ao processar webhook:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Webhook Hotmart ativo' })
}
