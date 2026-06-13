import canvasState from '../store/canvasState';

export function getMobileCanvasViewMetrics(container, wrapper, zoom = canvasState.viewZoom) {
  if (!container || !wrapper) return null;

  const canvas = wrapper.querySelector('.main-canvas');
  if (!canvas) return null;

  const baseWidth = canvas.offsetWidth;
  const baseHeight = canvas.offsetHeight;
  if (!baseWidth || !baseHeight) return null;

  const contentWidth = baseWidth * zoom;
  const contentHeight = baseHeight * zoom;
  const viewportWidth = container.clientWidth;
  const viewportHeight = container.clientHeight;

  const scrollableX = Math.max(0, contentWidth - viewportWidth);
  const scrollableY = Math.max(0, contentHeight - viewportHeight);

  const minPanX = scrollableX > 0 ? -scrollableX / 2 : 0;
  const maxPanX = scrollableX > 0 ? scrollableX / 2 : 0;
  const minPanY = scrollableY > 0 ? -scrollableY / 2 : 0;
  const maxPanY = scrollableY > 0 ? scrollableY / 2 : 0;

  const panX = canvasState.viewPanX;
  const panY = canvasState.viewPanY;
  const rawScrollX = panX - minPanX;
  const rawScrollY = panY - minPanY;

  return {
    contentWidth,
    contentHeight,
    viewportWidth,
    viewportHeight,
    scrollableX,
    scrollableY,
    minPanX,
    maxPanX,
    minPanY,
    maxPanY,
    panX,
    panY,
    scrollX: scrollableX > 0 ? scrollableX - rawScrollX : 0,
    scrollY: scrollableY > 0 ? scrollableY - rawScrollY : 0,
  };
}

export function clampPanToMetrics(panX, panY, metrics) {
  if (!metrics) {
    return { x: panX, y: panY };
  }

  return {
    x: Math.max(metrics.minPanX, Math.min(metrics.maxPanX, panX)),
    y: Math.max(metrics.minPanY, Math.min(metrics.maxPanY, panY)),
  };
}

export function panFromScroll(metrics, scrollX, scrollY) {
  if (!metrics) {
    return { x: 0, y: 0 };
  }

  return clampPanToMetrics(
    metrics.minPanX + (metrics.scrollableX - scrollX),
    metrics.minPanY + (metrics.scrollableY - scrollY),
    metrics
  );
}
