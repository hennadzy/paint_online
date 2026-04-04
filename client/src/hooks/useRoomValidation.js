import { useEffect } from 'react';
import { isValidRoomId } from '../utils/routerUtils';

export const useRoomValidation = (pathname, navigate) => {
  useEffect(() => {
    const fallback = document.getElementById('server-404-fallback');
    if (fallback) fallback.hidden = true;

    const allowedClientPaths = ['/', '/login', '/register', '/profile', '/404', '/admin', '/coloring', '/gallery'];
    if (allowedClientPaths.includes(pathname)) return;

    const segments = pathname.slice(1).split('/').filter(Boolean);
    if (segments.length !== 1) {
      navigate('/404', { replace: true });
      return;
    }

    if (!isValidRoomId(segments[0])) {
      navigate('/404', { replace: true });
    }
  }, [pathname, navigate]);
};
