/**
 * Webhook Hotmart — registra compradores autorizados no banco.
 *
 * Configure no painel Hotmart:
 *   URL: https://SEU-DOMINIO/api/webhooks/hotmart
 *   Eventos: PURCHASE_COMPLETE, PURCHASE_APPROVED, SUBSCRIPTION_REACTIVATED
 *
 * Configure a variável de ambiente:
 *   HOTMART_HOTTOK=<valor do hottok gerado no painel Hotmart>
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const HOTMART_HOTTOK = process.env.HOTMART_HOTTOK || ''

function normalizarCpf(cpf: string | undefined): string {
  if (!cpf) return ''
  return cpf.replace(/\D/g, '').trim()
}

export async function POST(req: NextRequest) {
  try {
    // Valida o hottok do Hotmart (header x-hotmart-hottok)
    const hottok = req.headers.get('x-hotmart-hottok') || ''
    if (HOTMART_HOTTOK && hottok !== HOTMART_HOTTOK) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    }

    const body = await req.json()

    // Estrutura do evento Hotmart v2
    const evento = body?.event || body?.type || ''
    const buyer = body?.data?.buyer || body?.buyer || {}
    const email: string = (buyer.email || '').trim().toLowerCase()
    const cpf: string = normalizarCpf(buyer.document || buyer.cpf || buyer.identity || '')
    const nome: string = buyer.name || buyer.nome || ''

    // Apenas processa eventos de compra/aprovação
    const eventosValidos = [
      'PURCHASE_COMPLETE',
      'PURCHASE_APPROVED',
      'SUBSCRIPTION_REACTIVATED',
      'PURCHASE_BILLET_PRINTED', // boleto gerado (opcional)
    ]

    if (!eventosValidos.includes(evento) && !eventosValidos.includes(body?.status)) {
      return NextResponse.json({ ok: true, ignorado: true, evento })
    }

    if (!email) {
      return NextResponse.json({ error: 'E-mail não encontrado no payload.' }, { status: 400 })
    }

    // Salva ou atualiza o comprador autorizado
    await (prisma as any).hotmart_compradores.upsert({
      where: { email },
      update: {
        cpf: cpf || undefined,
        nome: nome || undefined,
        evento,
        atualizado_em: new Date(),
      },
      create: {
        email,
        cpf: cpf || '',
        nome: nome || '',
        evento,
        criado_em: new Date(),
        atualizado_em: new Date(),
      },
    })

    console.info(`[hotmart-webhook] Comprador autorizado: ${email} (${cpf}) — evento: ${evento}`)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[hotmart-webhook]', err)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
