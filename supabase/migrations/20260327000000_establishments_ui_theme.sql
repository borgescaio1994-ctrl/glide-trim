-- Tema visual da loja (preto+dourado vs branco+dourado), escolhido pelo admin.
ALTER TABLE public.establishments
  ADD COLUMN IF NOT EXISTS ui_theme text NOT NULL DEFAULT 'dark_gold';

ALTER TABLE public.establishments
  DROP CONSTRAINT IF EXISTS establishments_ui_theme_check;

ALTER TABLE public.establishments
  ADD CONSTRAINT establishments_ui_theme_check
  CHECK (ui_theme IN ('dark_gold', 'light_gold'));

COMMENT ON COLUMN public.establishments.ui_theme IS 'dark_gold | light_gold — cores globais do app para esta unidade';
