export function getTouchDistance(t1, t2) {
  const dx = t2.clientX - t1.clientX;
  const dy = t2.clientY - t1.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

export function getTouchCenter(t1, t2) {
  return {
    x: (t1.clientX + t2.clientX) / 2,
    y: (t1.clientY + t2.clientY) / 2,
  };
}

export function attachPinchPanGestures({
  getTargets,
  getZoom,
  setZoom,
  getPan,
  setPan,
  clampZoom = (value) => Math.max(0.5, Math.min(3, value)),
  onPinchStart,
  onPinchEnd,
}) {
  const touchOptions = { passive: false, capture: true };
  const state = {
    initialDistance: 0,
    initialZoom: 1,
    initialPan: { x: 0, y: 0 },
    initialCenter: { x: 0, y: 0 },
    isPinching: false,
  };

  const handleTouchStart = (e) => {
    if (e.touches.length !== 2) return;

    e.preventDefault();
    onPinchStart?.();

    state.isPinching = true;
    state.initialDistance = getTouchDistance(e.touches[0], e.touches[1]);
    state.initialZoom = getZoom();
    state.initialPan = { ...getPan() };
    state.initialCenter = getTouchCenter(e.touches[0], e.touches[1]);
  };

  const handleTouchMove = (e) => {
    if (e.touches.length !== 2) return;

    e.preventDefault();

    if (state.initialDistance === 0) {
      state.initialDistance = getTouchDistance(e.touches[0], e.touches[1]);
      state.initialZoom = getZoom();
      state.initialPan = { ...getPan() };
      state.initialCenter = getTouchCenter(e.touches[0], e.touches[1]);
      return;
    }

    const currentDistance = getTouchDistance(e.touches[0], e.touches[1]);
    const scale = currentDistance / state.initialDistance;
    const nextZoom = clampZoom(state.initialZoom * scale);
    setZoom(nextZoom);

    const currentCenter = getTouchCenter(e.touches[0], e.touches[1]);
    setPan({
      x: state.initialPan.x + (currentCenter.x - state.initialCenter.x),
      y: state.initialPan.y + (currentCenter.y - state.initialCenter.y),
    });
  };

  const handleTouchEnd = (e) => {
    if (e.touches.length >= 2) return;

    state.initialDistance = 0;
    if (e.touches.length === 0) {
      state.isPinching = false;
      onPinchEnd?.(false);
      return;
    }

    setTimeout(() => {
      if (e.touches.length < 2) {
        state.isPinching = false;
        onPinchEnd?.(false);
      }
    }, 150);
  };

  const targets = getTargets();

  targets.forEach((target) => {
    target.addEventListener('touchstart', handleTouchStart, touchOptions);
    target.addEventListener('touchmove', handleTouchMove, touchOptions);
    target.addEventListener('touchend', handleTouchEnd, touchOptions);
    target.addEventListener('touchcancel', handleTouchEnd, touchOptions);
  });

  return () => {
    targets.forEach((target) => {
      target.removeEventListener('touchstart', handleTouchStart, touchOptions);
      target.removeEventListener('touchmove', handleTouchMove, touchOptions);
      target.removeEventListener('touchend', handleTouchEnd, touchOptions);
      target.removeEventListener('touchcancel', handleTouchEnd, touchOptions);
    });
  };
}

export function isMobileCanvasView() {
  return window.innerWidth <= 768 && window.innerHeight > window.innerWidth;
}
