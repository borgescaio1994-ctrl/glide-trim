type AppBrandLogoProps = {
  className?: string;
};

/**
 * Logo BookNow (`/booknow-mark.png`) — PNG com alpha.
 * Sem fundo, borda, sombra nem recorte arredondado por padrão (só a arte).
 */
export function AppBrandLogo({
  className = 'h-14 w-14 object-contain bg-transparent border-0 shadow-none ring-0 outline-none',
}: AppBrandLogoProps) {
  return (
    <img
      src="/booknow-mark.png"
      alt="BookNow"
      width={512}
      height={512}
      className={className}
      decoding="async"
    />
  );
}
