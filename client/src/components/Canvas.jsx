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
        if (!msg.username || msg.username === canvasState.username) return;

        switch (msg.method) {
          case "draw":
            drawHandler(msg);
            break;
          case "connection":
            setMessages((prev) => [...prev, `${msg.username} вошел в комнату`]);
            break;
          case "undo":
            undoHandler(msg);
            break;
          case "redo":
            redoHandler(msg);
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

    if (!msg.username || msg.username === canvasState.username) return;

    // ⭐️ Сохраняем состояние контекста для изоляции
    ctx.save();

    switch (figure.type) {
      case "brush":
        ctx.strokeStyle = figure.strokeStyle || "#000000";
        ctx.lineWidth = figure.lineWidth || 1;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        if (figure.isStart) {
          // ⭐️ ВСЕГДА начинаем новый путь при isStart
          ctx.beginPath();
          ctx.moveTo(figure.x, figure.y);
          activeUsersRef.current.set(username, { isDrawing: true, lastX: figure.x, lastY: figure.y });
        } else {
          const userState = activeUsersRef.current.get(username);
          if (userState && userState.isDrawing) {
            // Продолжаем линию от последней позиции
            ctx.beginPath();
            ctx.moveTo(userState.lastX, userState.lastY);
            ctx.lineTo(figure.x, figure.y);
            ctx.stroke();
            // Обновляем позицию
            activeUsersRef.current.set(username, { isDrawing: true, lastX: figure.x, lastY: figure.y });
          } else {
            // Если нет активного состояния - начинаем новый путь
            ctx.beginPath();
            ctx.moveTo(figure.x, figure.y);
            activeUsersRef.current.set(username, { isDrawing: true, lastX: figure.x, lastY: figure.y });
          }
        }
        break;

      case "eraser":
        ctx.globalCompositeOperation = "destination-out";
        ctx.lineWidth = figure.lineWidth || 10;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        if (figure.isStart) {
          ctx.beginPath();
          ctx.moveTo(figure.x, figure.y);
          activeUsersRef.current.set(username, { isDrawing: true, lastX: figure.x, lastY: figure.y });
        } else {
          const userState = activeUsersRef.current.get(username);
          if (userState && userState.isDrawing) {
            ctx.beginPath();
            ctx.moveTo(userState.lastX, userState.lastY);
            ctx.lineTo(figure.x, figure.y);
            ctx.stroke();
            activeUsersRef.current.set(username, { isDrawing: true, lastX: figure.x, lastY: figure.y });
          } else {
            ctx.beginPath();
            ctx.moveTo(figure.x, figure.y);
            activeUsersRef.current.set(username, { isDrawing: true, lastX: figure.x, lastY: figure.y });
          }
        }
        break;

      case "rect":
        ctx.beginPath();
        Rect.staticDraw(ctx, figure.x, figure.y, figure.width, figure.height, figure.strokeStyle, figure.lineWidth);
        break;

      case "circle":
        ctx.beginPath();
        Circle.staticDraw(ctx, figure.x, figure.y, figure.radius, figure.strokeStyle, figure.lineWidth);
        break;

      case "line":
        ctx.beginPath();
        Line.staticDraw(ctx, figure.x1, figure.y1, figure.x2, figure.y2, figure.strokeStyle, figure.lineWidth);
        break;

      case "finish":
        // ⭐️ Завершаем рисование пользователя
        ctx.beginPath();
        activeUsersRef.current.delete(username);
        break;

      default:
        console.warn("Неизвестный тип фигуры:", figure.type);
    }

    // ⭐️ Восстанавливаем состояние контекста
    ctx.restore();
  };

  const undoHandler = (msg) => {
    const ctx = canvasRef.current.getContext("2d");
    const img = new Image();
    img.src = msg.dataURL;
    img.onload = () => {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      ctx.drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height);
    };
  };

  const redoHandler = (msg) => {
    const ctx = canvasRef.current.getContext("2d");
    const img = new Image();
    img.src = msg.dataURL;
    img.onload = () => {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      ctx.drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height);
    };
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
        style={{ border: "1px solid black" }}
        onMouseDown={mouseDownHandler}
      />

      {!isRoomCreated && (
        <Button variant="primary" onClick={handleCreateRoomClick} style={{ marginTop: "10px" }}>
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
