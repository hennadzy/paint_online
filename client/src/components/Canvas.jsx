import React, { useEffect, useRef, useState } from "react";
import { Modal, Button } from "react-bootstrap";
import { observer } from "mobx-react-lite";
import { useParams } from "react-router-dom";
import axios from "axios";
import canvasState from "../store/canvasState";
import Toolbar from "./Toolbar";
import toolState from "../store/toolState";
import Brush from "../tools/Brush";
import Circle from "../tools/Circle";
import Rect from "../tools/Rect";
import Eraser from "../tools/Eraser";
import Line from "../tools/Line";
import "../styles/canvas.scss";

const Canvas = observer(() => {
  const canvasRef = useRef();
  const usernameRef = useRef();
  const [modal, setModal] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isRoomCreated, setIsRoomCreated] = useState(false);
  
  // ⭐️ Используем useRef для синхронного доступа к состоянию
  const activeUsersRef = useRef(new Map());
  
  const params = useParams();

  const updateCursor = (tool) => {
    const canvas = canvasRef.current;
    canvas.classList.remove("brush-cursor", "eraser-cursor");
    if (tool === "brush") canvas.classList.add("brush-cursor");
    else if (tool === "eraser") canvas.classList.add("eraser-cursor");
  };

  const adjustCanvasSize = () => {
    const canvas = canvasRef.current;
    const aspectRatio = 600 / 400;
    if (window.innerWidth < 768) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerWidth / aspectRatio;
    } else {
      canvas.width = 600;
      canvas.height = 400;
    }
    canvasState.setCanvas(canvas);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  useEffect(() => {
    adjustCanvasSize();
    window.addEventListener("resize", adjustCanvasSize);
    return () => window.removeEventListener("resize", adjustCanvasSize);
  }, []);

  useEffect(() => {
    if (canvasState.username) {
      const layer = canvasState.createLayer(canvasState.username);
      canvasState.setCurrentLayer(layer);
      // Добавляем слой в DOM только если он еще не добавлен
      const canvasContainer = canvasRef.current.parentElement;
      if (layer && !canvasContainer.contains(layer)) {
        canvasContainer.appendChild(layer);
      }
      // Синхронизируем размеры слоя с основным холстом
      const resizeLayer = () => {
        if (layer && canvasRef.current) {
          layer.width = canvasRef.current.width;
          layer.height = canvasRef.current.height;
        }
      };
      resizeLayer();
      window.addEventListener("resize", resizeLayer);
      return () => window.removeEventListener("resize", resizeLayer);
    }
  }, [canvasState.username]);

  useEffect(() => {
    canvasState.setCanvas(canvasRef.current);
    const ctx = canvasRef.current.getContext("2d");
    if (params.id) {
      axios
        .get(`https://paint-online-back.onrender.com/image?id=${params.id}`)
        .then((response) => {
          const img = new Image();
          img.src = response.data;
          img.onload = () => {
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            ctx.drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height);
          };
        })
        .catch((error) => console.error("Ошибка загрузки изображения:", error));
    } else {
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }

    const localBrush = new Brush(canvasRef.current, null, params.id, "local");
    toolState.setTool(localBrush, "brush");
    localBrush.listen();
    updateCursor("brush");
  }, [params.id]);

  useEffect(() => {
    if (canvasState.username) {
      const socket = new WebSocket("wss://paint-online-back.onrender.com/");
      canvasState.setSocket(socket);
      canvasState.setSessionId(params.id);

      const brush = new Brush(canvasRef.current, socket, params.id, canvasState.username);
      toolState.setTool(brush, "brush");
      brush.listen();
      updateCursor("brush");

      socket.onopen = () => {
        socket.send(
          JSON.stringify({
            id: params.id,
            username: canvasState.username,
            method: "connection",
          })
        );
      };

      socket.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        console.log("Received message:", msg); // Добавляем логирование для отладки

        if (!msg.username || msg.username === canvasState.username) return;

        switch (msg.method) {
          case "draw":
            drawHandler(msg);
            break;
          case "connection":
            setMessages((prev) => [...prev, `${msg.username} вошел в комнату`]);
            break;
          default:
            console.warn("Неизвестный метод:", msg.method);
        }
      };

      socket.onclose = () => {
        console.log("WebSocket соединение закрыто");
      };

      socket.onerror = (error) => {
        console.error("WebSocket ошибка:", error);
      };
    }
  }, [canvasState.username, params.id]);

  // ⭐️ БОЛЕЕ ПРОСТОЕ И НАДЁЖНОЕ решение
  const drawHandler = (msg) => {
    const figure = msg.figure;
    const ctx = canvasRef.current.getContext("2d");
    const username = msg.username;

    console.log("Drawing for user:", username, "figure:", figure); // Добавляем логирование

    if (!msg.username || msg.username === canvasState.username) return;

    // ⭐️ Сохраняем состояние контекста для изоляции
    ctx.save();

    switch (figure.type) {
      case "brush":
        // Рисуем на слое пользователя
        const userLayer = canvasState.getLayer(username);
        if (userLayer) {
          const layerCtx = userLayer.getContext("2d");
          layerCtx.strokeStyle = figure.strokeStyle || "#000000";
          layerCtx.lineWidth = figure.lineWidth || 1;
          layerCtx.lineCap = "round";
          layerCtx.lineJoin = "round";

          if (figure.isStart) {
            // ⭐️ ВСЕГДА начинаем новый путь при isStart
            layerCtx.beginPath();
            layerCtx.moveTo(figure.x, figure.y);
            activeUsersRef.current.set(username, { isDrawing: true, lastX: figure.x, lastY: figure.y });
          } else {
            const userState = activeUsersRef.current.get(username);
            if (userState && userState.isDrawing) {
              // Продолжаем линию от последней позиции
              layerCtx.beginPath();
              layerCtx.moveTo(userState.lastX, userState.lastY);
              layerCtx.lineTo(figure.x, figure.y);
              layerCtx.stroke();
              // Обновляем позицию
              activeUsersRef.current.set(username, { isDrawing: true, lastX: figure.x, lastY: figure.y });
            } else {
              // Если нет активного состояния - начинаем новый путь
              layerCtx.beginPath();
              layerCtx.moveTo(figure.x, figure.y);
              activeUsersRef.current.set(username, { isDrawing: true, lastX: figure.x, lastY: figure.y });
            }
          }
        }
        break;

      case "eraser":
        // Рисуем ластиком на слое пользователя
        const eraserLayer = canvasState.getLayer(username);
        if (eraserLayer) {
          const layerCtx = eraserLayer.getContext("2d");
          layerCtx.globalCompositeOperation = "destination-out";
          layerCtx.lineWidth = figure.lineWidth || 10;
          layerCtx.lineCap = "round";
          layerCtx.lineJoin = "round";

          if (figure.isStart) {
            layerCtx.beginPath();
            layerCtx.moveTo(figure.x, figure.y);
            activeUsersRef.current.set(username, { isDrawing: true, lastX: figure.x, lastY: figure.y });
          } else {
            const userState = activeUsersRef.current.get(username);
            if (userState && userState.isDrawing) {
              layerCtx.beginPath();
              layerCtx.moveTo(userState.lastX, userState.lastY);
              layerCtx.lineTo(figure.x, figure.y);
              layerCtx.stroke();
              activeUsersRef.current.set(username, { isDrawing: true, lastX: figure.x, lastY: figure.y });
            } else {
              layerCtx.beginPath();
              layerCtx.moveTo(figure.x, figure.y);
              activeUsersRef.current.set(username, { isDrawing: true, lastX: figure.x, lastY: figure.y });
            }
          }
        }
        break;

      case "rect":
        // Рисуем прямоугольник на слое пользователя
        const rectLayer = canvasState.getLayer(username);
        if (rectLayer) {
          const layerCtx = rectLayer.getContext("2d");
          Rect.staticDraw(layerCtx, figure.x, figure.y, figure.width, figure.height, figure.strokeStyle, figure.lineWidth);
        }
        break;

      case "circle":
        // Рисуем круг на слое пользователя
        const circleLayer = canvasState.getLayer(username);
        if (circleLayer) {
          const layerCtx = circleLayer.getContext("2d");
          Circle.staticDraw(layerCtx, figure.x, figure.y, figure.radius, figure.strokeStyle, figure.lineWidth);
        }
        break;

      case "line":
        // Рисуем линию на слое пользователя
        const lineLayer = canvasState.getLayer(username);
        if (lineLayer) {
          const layerCtx = lineLayer.getContext("2d");
          Line.staticDraw(layerCtx, figure.x1, figure.y1, figure.x2, figure.y2, figure.strokeStyle, figure.lineWidth);
        }
        break;

      case "finish":
        // ⭐️ Завершаем рисование пользователя
        ctx.beginPath();
        activeUsersRef.current.delete(username);
        break;

      case "undo":
        // Undo влияет только на слой пользователя, отправившего undo
        const undoLayer = canvasState.getLayer(username);
        if (undoLayer) {
          const undoImg = new Image();
          undoImg.src = figure.dataURL;
          undoImg.onload = () => {
            const layerCtx = undoLayer.getContext("2d");
            layerCtx.clearRect(0, 0, undoLayer.width, undoLayer.height);
            layerCtx.drawImage(undoImg, 0, 0, undoLayer.width, undoLayer.height);
          };
        }
        break;

      case "redo":
        // Redo влияет только на слой пользователя, отправившего redo
        const redoLayer = canvasState.getLayer(username);
        if (redoLayer) {
          const redoImg = new Image();
          redoImg.src = figure.dataURL;
          redoImg.onload = () => {
            const layerCtx = redoLayer.getContext("2d");
            layerCtx.clearRect(0, 0, redoLayer.width, redoLayer.height);
            layerCtx.drawImage(redoImg, 0, 0, redoLayer.width, redoLayer.height);
          };
        }
        break;

      default:
        console.warn("Неизвестный тип фигуры:", figure.type);
    }

    // ⭐️ Восстанавливаем состояние контекста
    ctx.restore();
  };



  const connectHandler = () => {
    const username = usernameRef.current.value.trim();
    if (username) {
      canvasState.setUsername(username);
      setModal(false);
    } else {
      alert("Введите ваше имя");
    }
  };

  const mouseDownHandler = () => {
    canvasState.pushToUndo(canvasRef.current.toDataURL());
    axios.post(`https://paint-online-back.onrender.com/image?id=${params.id}`, {
      img: canvasRef.current.toDataURL(),
    });
  };

  const handleCreateRoomClick = () => {
    setModal(true);
    setIsRoomCreated(true);
  };

  return (
    <div className="canvas" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <Modal show={modal} onHide={() => setModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Введите ваше имя</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <input
            type="text"
            autoFocus
            ref={usernameRef}
            placeholder="Ваше имя"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                connectHandler();
              }
            }}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={connectHandler}>
            Войти
          </Button>
        </Modal.Footer>
      </Modal>

      <canvas
        ref={canvasRef}
        tabIndex={0}
        className="main-canvas"
        onMouseDown={mouseDownHandler}
      />

      {!isRoomCreated && (
        <Button variant="primary" onClick={handleCreateRoomClick} style={{ marginTop: "20px", position: "relative", zIndex: 10 }}>
          Создать комнату
        </Button>
      )}

      <div style={{ marginTop: "10px", textAlign: "center" }}>
        {messages.map((message, index) => (
          <div key={index}>{message}</div>
        ))}
      </div>
    </div>
  );
});

export default Canvas;
