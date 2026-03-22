/** Chaves centralizadas para cache e invalidação do TanStack Query */
export const queryKeys = {
  profile: (userId: string | undefined) => ['profile', userId] as const,
  establishment: (hostname: string, slug: string | null) => ['establishment', hostname, slug] as const,
  clientHome: (establishmentId: string | null) => ['clientHome', establishmentId] as const,
  barberDashboard: (profileId: string | undefined, dateKey: string) =>
    ['barberDashboard', profileId, dateKey] as const,
  barberHomeTitle: (establishmentId: string | undefined) => ['barberHomeTitle', establishmentId] as const,
  barberStats: (profileId: string | undefined) => ['barberStats', profileId] as const,
  finances: (profileId: string | undefined, period: string) => ['finances', profileId, period] as const,
  services: (
    profileId: string | undefined,
    role: string | undefined,
    establishmentId: string | null | undefined
  ) => ['services', profileId, role, establishmentId] as const,
  appointmentsList: (profileId: string | undefined) => ['appointments', 'list', profileId] as const,
  establishmentSubscription: (establishmentId: string | undefined) =>
    ['establishmentSubscription', establishmentId] as const,
};
