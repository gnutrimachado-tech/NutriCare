-- Data escolhida pelo nutricionista para a avaliação registrada na Anamnese.
-- Execute uma vez no mesmo banco usado pelo Vercel antes do deploy.
ALTER TABLE "anamneses"
ADD COLUMN IF NOT EXISTS "data_avaliacao" DATE;