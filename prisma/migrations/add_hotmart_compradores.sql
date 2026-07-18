-- Migration: Tabela de compradores autorizados pela Hotmart
-- Execute no banco com: npx prisma db execute --file prisma/migrations/add_hotmart_compradores.sql
-- OU copie e cole no painel do Neon (neon.tech) em SQL Editor

CREATE TABLE IF NOT EXISTS hotmart_compradores (
  id           SERIAL PRIMARY KEY,
  email        TEXT NOT NULL UNIQUE,
  cpf          TEXT NOT NULL DEFAULT '',
  nome         TEXT NOT NULL DEFAULT '',
  evento       TEXT NOT NULL DEFAULT 'MANUAL',
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hotmart_compradores_email ON hotmart_compradores(email);
CREATE INDEX IF NOT EXISTS idx_hotmart_compradores_cpf   ON hotmart_compradores(cpf);

-- Adicionar coluna CPF na tabela nutricionistas (se ainda não existir)
ALTER TABLE nutricionistas ADD COLUMN IF NOT EXISTS cpf TEXT;
ALTER TABLE nutricionistas ADD COLUMN IF NOT EXISTS telefone TEXT;
ALTER TABLE nutricionistas ADD COLUMN IF NOT EXISTS cnpj TEXT;
ALTER TABLE nutricionistas ADD COLUMN IF NOT EXISTS estado_crn TEXT;
ALTER TABLE nutricionistas ADD COLUMN IF NOT EXISTS area_atuacao TEXT;

-- Tabela de tokens para redefinição de senha
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id        SERIAL PRIMARY KEY,
  email     TEXT NOT NULL UNIQUE,
  token     TEXT NOT NULL,
  expira_em TIMESTAMPTZ NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- INSTRUÇÃO APÓS RODAR ESTA MIGRATION:
--
-- 1. Adicione ao schema.prisma:
--
--   model hotmart_compradores {
--     id             Int      @id @default(autoincrement())
--     email          String   @unique
--     cpf            String   @default("")
--     nome           String   @default("")
--     evento         String   @default("MANUAL")
--     criado_em      DateTime @default(now())
--     atualizado_em  DateTime @default(now())
--   }
--
--   model password_reset_tokens {
--     id        Int      @id @default(autoincrement())
--     email     String   @unique
--     token     String
--     expira_em DateTime
--     criado_em DateTime @default(now())
--   }
--
-- 2. Rode: npx prisma generate
--
-- 3. No painel Hotmart → Ferramentas → Webhooks:
--    URL: https://nutri-care-ey2e.vercel.app/api/webhooks/hotmart
--    Eventos: PURCHASE_COMPLETE, PURCHASE_APPROVED, SUBSCRIPTION_REACTIVATED
--
-- 4. Variável de ambiente no Vercel:
--    HOTMART_HOTTOK = <valor que o Hotmart gera ao criar o webhook>
--
-- CADASTRO MANUAL (enquanto não há compras novas):
-- INSERT INTO hotmart_compradores (email, cpf, nome, evento)
-- VALUES ('email@exemplo.com', '12345678901', 'Nome Completo', 'MANUAL');
-- ─────────────────────────────────────────────────────────────────────────────
