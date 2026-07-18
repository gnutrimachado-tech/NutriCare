-- Execute no painel do Neon (SQL Editor) ou via:
-- npx prisma db execute --file prisma/migrations/add_hotmart_compradores.sql

CREATE TABLE IF NOT EXISTS hotmart_compradores (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  cpf           TEXT NOT NULL DEFAULT '',
  nome          TEXT NOT NULL DEFAULT '',
  evento        TEXT NOT NULL DEFAULT 'MANUAL',
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hotmart_email ON hotmart_compradores(email);
CREATE INDEX IF NOT EXISTS idx_hotmart_cpf   ON hotmart_compradores(cpf);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id        SERIAL PRIMARY KEY,
  email     TEXT NOT NULL UNIQUE,
  token     TEXT NOT NULL,
  expira_em TIMESTAMPTZ NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Colunas extras no nutricionista (se ainda não existirem)
ALTER TABLE nutricionistas ADD COLUMN IF NOT EXISTS cpf       TEXT;
ALTER TABLE nutricionistas ADD COLUMN IF NOT EXISTS telefone  TEXT;
ALTER TABLE nutricionistas ADD COLUMN IF NOT EXISTS cnpj      TEXT;
ALTER TABLE nutricionistas ADD COLUMN IF NOT EXISTS estado_crn TEXT;
ALTER TABLE nutricionistas ADD COLUMN IF NOT EXISTS area_atuacao TEXT;

-- ─────────────────────────────────────────────────────────────────────
-- APÓS RODAR O SQL — adicione ao schema.prisma:
--
-- model hotmart_compradores {
--   id            Int      @id @default(autoincrement())
--   email         String   @unique
--   cpf           String   @default("")
--   nome          String   @default("")
--   evento        String   @default("MANUAL")
--   criado_em     DateTime @default(now())
--   atualizado_em DateTime @default(now())
-- }
--
-- model password_reset_tokens {
--   id        Int      @id @default(autoincrement())
--   email     String   @unique
--   token     String
--   expira_em DateTime
--   criado_em DateTime @default(now())
-- }
--
-- Depois rode: npx prisma generate
--
-- CADASTRO MANUAL (para você mesmo ou clientes já existentes):
-- INSERT INTO hotmart_compradores (email, cpf, nome, evento)
-- VALUES ('seuemail@gmail.com', '12345678901', 'Seu Nome', 'MANUAL')
-- ON CONFLICT (email) DO UPDATE SET cpf = EXCLUDED.cpf;
-- ─────────────────────────────────────────────────────────────────────
