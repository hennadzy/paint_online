// ...импорты и setup остаются прежними...

const drawHandler = (msg) => {
  const figure = msg.figure;
  const ctx = canvasRef.current.getContext("2d");

  switch (figure.type) {
    case "brush":
      drawStroke(ctx, figure);
      canvasState.pushStroke(figure); // ← сохраняем входящий stroke
      break;
    case "eraser":
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = figure.lineWidth || 10;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(figure.x, figure.y);
      ctx.lineTo(figure.x + 0.1, figure.y + 0.1);
      ctx.stroke();
      ctx.globalCompositeOperation = "source-over";
      break;
    case "rect":
      ctx.beginPath();
      Rect.staticDraw(ctx, figure.x, figure.y, figure.width, figure.height, figure.strokeStyle, figure.lineWidth);
      canvasState.pushStroke(figure);
      break;
    case "circle":
      ctx.beginPath();
      Circle.staticDraw(ctx, figure.x, figure.y, figure.radius, figure.strokeStyle, figure.lineWidth);
      canvasState.pushStroke(figure);
      break;
    case "line":
      ctx.beginPath();
      Line.staticDraw(ctx, figure.x1, figure.y1, figure.x2, figure.y2, figure.strokeStyle, figure.lineWidth);
      canvasState.pushStroke(figure);
      break;
    case "undo":
    case "redo":
      const img = new Image();
      img.src = figure.dataURL;
      img.onload = () => {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height);
      };
      break;
    default:
      console.warn("Неизвестный тип фигуры:", figure.type);
  }
};

const mouseDownHandler = () => {
  // ❌ canvasState.pushToUndo() — удалено
  axios.post(`https://paint-online-back.onrender.com/image?id=${params.id}`, {
    img: canvasRef.current.toDataURL(),
  });
};
