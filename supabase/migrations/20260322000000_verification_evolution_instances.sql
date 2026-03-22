-- Instância Evolution por barbearia (WhatsApp do dono → clientes)
-- + chave opcional em system_settings: master_evolution_instance (código p/ donos)

ALTER TABLE public.establishments
  ADD COLUMN IF NOT EXISTS whatsapp_evolution_instance TEXT;

COMMENT ON COLUMN public.establishments.whatsapp_evolution_instance IS
  'Nome da instância na Evolution API conectada ao WhatsApp da barbearia (envio de códigos a clientes).';
