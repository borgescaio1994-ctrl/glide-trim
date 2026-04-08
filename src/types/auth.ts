export type ProfileRole = 'SUPER_ADMIN' | 'ADMIN_BARBER' | 'BARBER' | 'CUSTOMER';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: 'client' | 'barber' | 'admin';
  profile_role?: ProfileRole;
  establishment_id: string | null;
  is_verified: boolean;
  phone: string;
  avatar_url?: string | null;
  phone_number?: string | null;
  whatsapp_number?: string | null;
  phone_verified?: boolean | null;
  /** false = não aparece na vitrine do cliente / dono só como admin */
  visible_on_client_home?: boolean | null;
}
