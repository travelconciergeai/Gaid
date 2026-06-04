import { useState, useEffect } from 'react';

/** lg = 1024px — sidebar desktop; abaixo disso usa navegação mobile */
export function useBreakpoint() {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
  );

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return { isDesktop, isMobile: !isDesktop };
}
