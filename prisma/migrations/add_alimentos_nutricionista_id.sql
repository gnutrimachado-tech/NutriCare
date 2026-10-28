-- Associa os alimentos personalizados ao nutricionista que os cadastrou.
-- Execute este SQL no banco Neon antes de publicar a versão com a nova API.
ALTER TABLE public.alimentos
  ADD COLUMN IF NOT EXISTS nutricionista_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'alimentos_nutricionista_id_fkey'
      AND conrelid = 'public.alimentos'::regclass
  ) THEN
    ALTER TABLE public.alimentos
      ADD CONSTRAINT alimentos_nutricionista_id_fkey
      FOREIGN KEY (nutricionista_id)
      REFERENCES public.nutricionistas(id)
      ON DELETE SET NULL
      ON UPDATE NO ACTION;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_alimentos_nutricionista
  ON public.alimentos(nutricionista_id);
