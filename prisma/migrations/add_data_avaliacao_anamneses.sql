-- Data escolhida pelo nutricionista para identificar quando a avaliação foi feita.
-- A coluna é opcional para não quebrar anamneses antigas; elas recebem a data
-- de criação como valor inicial e podem ser corrigidas pela aba Anamnese.
ALTER TABLE "anamneses"
  ADD COLUMN IF NOT EXISTS "data_avaliacao" DATE;

UPDATE "anamneses"
SET "data_avaliacao" = "created_at"::date
WHERE "data_avaliacao" IS NULL
  AND "created_at" IS NOT NULL;
