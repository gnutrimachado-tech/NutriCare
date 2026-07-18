/**
 * Webhook Hotmart — registra compradores autorizados no banco.
 *
 * Configure no painel Hotmart → Ferramentas → Webhooks:
 *   URL: https://nutri-care-ey2e.vercel.app/api/webhooks/hotmart
 *   Eventos: PURCHASE_COMPLETE, PURCHASE_APPROVED, SUBSCRIPTION_REACTIVATED
 *
 * Variável de ambiente (Vercel):
 *   HOTMART_HOTTOK = <valor gerado pelo Hotmart ao criar o webhook>
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const HOTMART_HOTTOK = process.env.HOTMART_HOTTOK || ''

function normalizarCpf(v: string | undefined): string {
  return (v || '').replace(/\D/g, '').trim()
}

const EVENTOS_VALIDOS = [
  'PURCHASE_COMPLETE',
  'PURCHASE_APPROVED',
  'SUBSCRIPTION_REACTIVATED',
]

export async function POST(req: NextRequest) {
  try {
    const hottok = req.headers.get('x-hotmart-hottok') || ''
    if (HOTMART_HOTTOK && hottok !== HOTMART_HOTTOK) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    }

    const body = await req.json()
    const evento: string = body?.event || body?.type || ''
    const buyer = body?.data?.buyer || body?.buyer || {}
    const email: string = (buyer.email || '').trim().toLowerCase()
    const cpf: string = normalizarCpf(buyer.document || buyer.cpf || buyer.identity)
    const nome: string = buyer.name || buyer.nome || ''

    if (!EVENTOS_VALIDOS.includes(evento)) {
      return NextResponse.json({ ok: true, ignorado: true, evento })
    }
    if (!email) {
      return NextResponse.json({ error: 'E-mail não encontrado no payload.' }, { status: 400 })
    }

    await (prisma as any).hotmart_compradores.upsert({
      where: { email },
      update: { cpf: cpf || undefined, nome: nome || undefined, evento, atualizado_em: new Date() },
      create: { email, cpf: cpf || '', nome: nome || '', evento, criado_em: new Date(), atualizado_em: new Date() },
    })

    console.info(`[hotmart-webhook] Autorizado: ${email} (${cpf}) — ${evento}`)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[hotmart-webhook]', err)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
