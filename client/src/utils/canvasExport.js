export function createOpaqueCanvas(sourceCanvas, background = '#ffffff') {
  if (!sourceCanvas) return null;

  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = sourceCanvas.width;
  exportCanvas.height = sourceCanvas.height;

  const ctx = exportCanvas.getContext('2d');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
  ctx.drawImage(sourceCanvas, 0, 0);

  return exportCanvas;
}
