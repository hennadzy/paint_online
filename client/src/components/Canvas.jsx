import React, { useEffect, useRef, useState } from "react";
import { Modal, Button } from "react-bootstrap";
import { observer } from "mobx-react-lite";
import { useParams } from "react-router-dom";
import axios from "axios";
import canvasState from "../store/canvasState";
import toolState from "../store/toolState";
import Brush from "../tools/Brush";
import Circle from "../tools/Circle";
import Rect from "../tools/Rect";
import Line from "../tools/Line";
import "../styles/canvas.scss";

const Canvas = observer(() => {
  const canvasRef = useRef();
  const cursorRef = useRef();
  const containerRef = useRef();
  const usernameRef = useRef();
  const [modal, setModal] = useState(false);
  const [messages, setMessages] = useState([]);
  const params = useParams();

  const adjustCanvasSize = () => {
    const canvas = canvasRef.current;
    const cursor = cursorRef.current;
    const aspectRatio = 720 / 480;
    const logicalWidth = 720;
    const logicalHeight = 480;

    canvas.width = logicalWidth;
    canvas.height = logicalHeight;
    cursor.width = logicalWidth;
    cursor.height = logicalHeight;

    if (window.innerWidth < 768) {
      const displayWidth = window.innerWidth;
      const displayHeight = displayWidth / aspectRatio;
      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${displayHeight}px`;
      cursor.style.width = `${displayWidth}px`;
      cursor.style.height = `${displayHeight}px`;
    } else {
      canvas.style.width = `${logicalWidth}px`;
      canvas.style.height = `${logicalHeight}px`;
      cursor.style.width = `${logicalWidth}px`;
      cursor.style.height = `${logicalHeight}px`;
    }

    canvasState.setCanvas(canvas);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, logicalWidth, logicalHeight);
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
      axios.get(`https://paint-online-back.onrender.com/image?id=${params.id}`)
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
    canvasState.setUsername("local");
    toolState.setTool(localBrush, "brush");
    updateCursor("brush");
    return () => {
      canvasState.strokeList = [];
      canvasState.redoStacks.clear();
      canvasState.redrawCanvas();
    };
  }, [params.id]);

  const updateCursorOverlay = (x, y) => {
    const canvas = cursorRef.current;
    const ctx = canvas.getContext("2d");
    const diameter = toolState.tool?.lineWidth ?? 1;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.arc(x, y, diameter / 2, 0, 2 * Math.PI);
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1;
    ctx.stroke();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const cursor = cursorRef.current;

    const handleMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = ((e.touches?.[0]?.pageX ?? e.pageX) - rect.left) * scaleX;
      const y = ((e.touches?.[0]?.pageY ?? e.pageY) - rect.top) * scaleY;
      updateCursorOverlay(x, y);
    };

    const clearCursor = () => {
      const ctx = cursor.getContext("2d");
      ctx.clearRect(0, 0, cursor.width, cursor.height);
    };

    canvas.addEventListener("mousemove", handleMove);
    canvas.addEventListener("touchmove", handleMove, { passive: false });
    canvas.addEventListener("mouseleave", clearCursor);
    canvas.addEventListener("touchend", clearCursor);

    return () => {
      canvas.removeEventListener("mousemove", handleMove);
      canvas.removeEventListener("touchmove", handleMove);
      canvas.removeEventListener("mouseleave", clearCursor);
      canvas.removeEventListener("touchend", clearCursor);
    };
  }, []);

  const connectHandler = async () => {
    const username = usernameRef.current.value.trim();
    if (!username) return alert("Введите ваше имя");
    canvasState.setUsername(username);
    setModal(false);
    canvasState.strokeList = [];
    canvasState.redoStacks.clear();
    canvasState.redrawCanvas();
    try {
      const socket = new WebSocket("wss://paint-online-back.onrender.com/");
      canvasState.setSocket(socket);
      canvasState.setSessionId(params.id);
      const brush = new Brush(canvasRef.current, socket, params.id, username);
      toolState.setTool(brush, "brush");
      updateCursor("brush");
      socket.onopen = () => {
        socket.send(JSON.stringify({
          id: params.id,
          username,
          method: "connection",
        }));
      };
      socket.onclose = () => {
        canvasState.strokeList = [];
        canvasState.redoStacks.clear();
        canvasState.redrawCanvas();
      };
      socket.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.method === "connection") {
          setMessages(prev => [...prev, `Пользователь ${msg.username} вошел в комнату`]);
        }
        if (!msg.username || msg.username === canvasState.username) return;
        drawHandler(msg);
      };
    } catch (error) {
      console.error("Ошибка подключения к WebSocket:", error);
    }
  };

  const drawHandler = (msg) => {
    const figure = msg.figure;
    const ctx = canvasRef.current.getContext("2d");
    switch (figure.type) {
      case "brush":
      case "eraser":
        drawStroke(ctx, figure, figure.type === "eraser");
        canvasState.pushStroke(figure);
        break;
      case "rect":
        Rect.staticDraw(ctx, figure.x, figure.y, figure.width, figure.height, figure.strokeStyle, figure.lineWidth);
        canvasState.pushStroke(figure);
        break;
      case "circle":
        Circle.staticDraw(ctx, figure.x, figure.y, figure.radius, figure.strokeStyle, figure.lineWidth);
        canvasState.pushStroke(figure);
        break;
      case "line":
        Line.staticDraw(ctx, figure.x1, figure.y1, figure.x2, figure.y2, figure.strokeStyle, figure.lineWidth);
        canvasState.pushStroke(figure);
        break;
      case "undo":
        canvasState.undoRemote(msg.username);
        break;
      case "redo":
        canvasState.redoRemote(msg.username);
        break;
    }
  };

  const drawStroke = (ctx, stroke, isEraser = false) => {
    const points = stroke.points;
    if (!points || points.length === 0) return;
    ctx.save();
    ctx.lineWidth = stroke.lineWidth || 1;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = isEraser ? "rgba(0,0,0,1)" : stroke.strokeStyle || "#000000";
    ctx.globalCompositeOperation = isEraser ? "destination-out" : "source-over";
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
    ctx.restore();
  };

  const mouseDownHandler = async () => {
    if (params.id) {
      try {
        await axios.post(`https://paint-online-back.onrender.com/image?id=${params.id}`, {
          img: canvasRef.current.toDataURL(),
        });
      } catch (error) {
        console.error("Ошибка сохранения изображения:", error);
      }
    }
  };

  const handleCreateRoomClick = () => {
    setModal(true);
  };

  const updateCursor = (tool) => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.classList.remove(
        "brush-cursor",
        "eraser-cursor",
        "rect-cursor",
        "circle-cursor",
        "line-cursor"
      );
      canvas.classList.add(`${tool}-cursor`);
    }
  };
  return (
    <div className="canvas">
      <Modal show={modal} onHide={() => setModal(false)}>
        <Modal.Header>
          <Modal.Title>Введите ваше имя</Modal.Title>
          <button
            type="button"
            className="btn-close"
            aria-label="Close"
            onClick={() => setModal(false)}
            onTouchEnd={() => setModal(false)}
          ></button>
        </Modal.Header>
        <Modal.Body>
          <input
            type="text"
            autoFocus
            ref={usernameRef}
            placeholder="Ваше имя"
            onKeyDown={(e) => {
              if (e.key === "Enter") connectHandler();
            }}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={connectHandler}
            onTouchEnd={connectHandler}
          >
            Войти
          </Button>
        </Modal.Footer>
      </Modal>

      <div className="canvas-layout">
        <div className="canvas-container" ref={containerRef}>
          <canvas
            ref={canvasRef}
            tabIndex={0}
            className="main-canvas"
            onMouseDown={mouseDownHandler}
          />
          <canvas
            ref={cursorRef}
            className="cursor-overlay"
          />
        </div>

        <div className="canvas-side-panel">
          <Button
            variant="primary"
            onClick={handleCreateRoomClick}
            onTouchEnd={handleCreateRoomClick}
            className="create-room-btn"
          >
            Создать комнату
          </Button>

          <div className="user-messages-glass">
            {messages.map((message, index) => (
              <div key={index} className="user-message-line">
                {message}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

});

export default Canvas;
