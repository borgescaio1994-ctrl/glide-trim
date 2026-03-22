import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Ao mudar rota (ou F5 na mesma URL), sobe o scroll para o topo. */
export default function ScrollAndReloadSync() {
  const location = useLocation();

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname, location.search, location.hash]);

  return null;
}
