-- ============================================================
-- Migração manual: CPF em nutricionistas + tabela cpf_permitidos
-- Execute no banco de dados Neon do projeto NutriCare
-- ============================================================

-- 1. Adiciona coluna CPF na tabela nutricionistas (se não existir)
ALTER TABLE nutricionistas
  ADD COLUMN IF NOT EXISTS cpf VARCHAR(14) UNIQUE;

-- 2. Cria tabela cpf_permitidos para controle de acesso via Hotmart
CREATE TABLE IF NOT EXISTS cpf_permitidos (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cpf        VARCHAR(14) UNIQUE NOT NULL,
  email      VARCHAR(150),
  nome       VARCHAR(150),
  usado      BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
