import type { Profile } from '@/types/auth';

/** Dono (ADMIN_BARBER) que desativou atuação como barbeiro na vitrine: só painel admin, sem rotas de profissional. */
export function isOwnerAdminBarberToolsDisabled(profile: Profile | null | undefined): boolean {
  return profile?.profile_role === 'ADMIN_BARBER' && profile.visible_on_client_home === false;
}
