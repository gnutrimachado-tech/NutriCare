import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'

const BREVO_API_KEY = process.env.BREVO_API_KEY!
const BREVO_FROM_EMAIL = process.env.BREVO_FROM_EMAIL || 'noreply@nutricare.com'
const BREVO_FROM_NAME = process.env.BREVO_FROM_NAME || 'NutriCare'

// URL base do sistema (produção ou desenvolvimento)
function getBaseUrl(): string {
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL.replace(/\/$/, '')
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email?.trim()) {
      return NextResponse.json({ error: 'E-mail é obrigatório.' }, { status: 400 })
    }

    const emailNorm = email.trim().toLowerCase()

    // Busca o nutricionista pelo e-mail
    const nutricionista = await prisma.nutricionistas.findUnique({
      where: { email: emailNorm },
    })

    // Resposta genérica: não revela se o e-mail existe ou não (segurança)
    const mensagemGenerico =
      'Se o e-mail estiver cadastrado, você receberá as instruções em breve. Verifique sua caixa de entrada (e o spam).'

    if (!nutricionista) {
      return NextResponse.json({ message: mensagemGenerico })
    }

    // Gera token de recuperação (válido por 1 hora)
    const token = randomBytes(32).toString('hex')
    const expiracao = new Date(Date.now() + 60 * 60 * 1000) // +1h

    // Salva o token no banco — tente primeiro com a tabela password_reset_tokens,
    // se não existir, salva diretamente no nutricionista (coluna reset_token / reset_token_exp)
    try {
      await (prisma as any).password_reset_tokens.upsert({
        where: { email: emailNorm },
        update: { token, expira_em: expiracao },
        create: { email: emailNorm, token, expira_em: expiracao },
      })
    } catch {
      // Fallback: salva no próprio nutricionista (se tiver as colunas)
      try {
        await (prisma as any).nutricionistas.update({
          where: { email: emailNorm },
          data: { reset_token: token, reset_token_exp: expiracao },
        })
      } catch {
        console.warn('[forgot-password] Nenhuma tabela de token disponível — execute a migration SQL.')
        // Mesmo assim, envia o e-mail como fallback (token não vai funcionar sem DB)
      }
    }

    const linkReset = `${getBaseUrl()}/redefinir-senha?token=${token}`

    // Envia e-mail via Brevo
    if (BREVO_API_KEY) {
      await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': BREVO_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: BREVO_FROM_NAME, email: BREVO_FROM_EMAIL },
          to: [{ email: emailNorm, name: nutricionista.nome || 'Nutricionista' }],
          subject: '🔐 NutriCare — Redefinição de senha',
          htmlContent: `
            <!DOCTYPE html>
            <html>
            <head><meta charset="UTF-8"></head>
            <body style="margin:0;padding:0;background:#f0f4f0;font-family:'Segoe UI',Arial,sans-serif;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td align="center" style="padding:40px 20px;">
                  <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                    <tr>
                      <td style="background:linear-gradient(135deg,#1a4d1a,#246324);padding:32px;text-align:center;">
                        <h1 style="color:#fff;margin:0;font-size:28px;letter-spacing:-0.5px;">NutriCare</h1>
                        <p style="color:rgba(255,255,255,0.75);margin:4px 0 0;font-size:11px;letter-spacing:2px;">CIÊNCIA • NUTRIÇÃO • BEM-ESTAR</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:36px 40px;">
                        <h2 style="margin:0 0 12px;color:#1a4d1a;font-size:20px;">Olá, ${nutricionista.nome?.split(' ')[0] || 'Nutricionista'}!</h2>
                        <p style="color:#475569;line-height:1.6;margin:0 0 24px;">
                          Recebemos uma solicitação para redefinir a senha da sua conta NutriCare.<br>
                          Clique no botão abaixo para criar uma nova senha. O link é válido por <strong>1 hora</strong>.
                        </p>
                        <div style="text-align:center;margin:28px 0;">
                          <a href="${linkReset}" style="display:inline-block;background:linear-gradient(135deg,#1a4d1a,#246324);color:#fff;text-decoration:none;padding:14px 36px;border-radius:12px;font-weight:700;font-size:15px;letter-spacing:0.5px;">
                            Redefinir minha senha
                          </a>
                        </div>
                        <p style="color:#94a3b8;font-size:12px;line-height:1.5;margin:0;">
                          Se você não solicitou a redefinição de senha, pode ignorar este e-mail com segurança.<br>
                          Sua senha atual permanecerá a mesma.
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #f1f5f9;">
                        <p style="color:#cbd5e1;font-size:11px;margin:0;">© ${new Date().getFullYear()} NutriCare — Todos os direitos reservados</p>
                      </td>
                    </tr>
                  </table>
                </td></tr>
              </table>
            </body>
            </html>
          `,
        }),
      })
    }

    return NextResponse.json({ message: mensagemGenerico })
  } catch (err) {
    console.error('[forgot-password]', err)
    return NextResponse.json(
      { error: 'Erro ao processar. Tente novamente.' },
      { status: 500 }
    )
  }
}
