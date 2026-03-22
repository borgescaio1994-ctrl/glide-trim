export interface Establishment {
  id: string;
  name: string;
  slug: string;
  home_title?: string | null;
  logo_url: string | null;
  primary_color: string | null;
  custom_domain?: string | null;
  status: boolean;
  whatsapp_sender_phone?: string | null;
  ui_theme?: 'dark_gold' | 'light_gold' | null;
}
