import { useEffect } from 'react';

const MOBILE_MQ = '(max-width: 768px)';

export function useMobileSettingBarHeight(barRef) {
  useEffect(() => {
    const el = barRef.current;
    if (!el) return;

    const mq = window.matchMedia(MOBILE_MQ);

    const update = () => {
      if (!mq.matches) {
        document.documentElement.style.removeProperty('--mobile-setting-bar-h');
        return;
      }

      if (getComputedStyle(el).display === 'none') return;

      const height = Math.ceil(el.getBoundingClientRect().height);
      if (height <= 0) return;

      document.documentElement.style.setProperty('--mobile-setting-bar-h', `${height}px`);
      window.dispatchEvent(new Event('resize'));
    };

    update();

    const ro = new ResizeObserver(() => {
      requestAnimationFrame(update);
    });
    ro.observe(el);

    const onLayoutChange = () => requestAnimationFrame(update);
    window.addEventListener('resize', onLayoutChange);
    window.addEventListener('orientationchange', onLayoutChange);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', onLayoutChange);
      window.removeEventListener('orientationchange', onLayoutChange);
    };
  }, [barRef]);
}
