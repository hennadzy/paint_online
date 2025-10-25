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
  const params = useParams();

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
          default:
            console.warn("Неизвестный метод:", msg.method);
        }
      };
    }
  }, [canvasState.username, params.id]);

  const drawHandler = (msg) => {
    const figure = msg.figure;
    const ctx = canvasRef.current.getContext("2d");

    switch (figure.type) {
      case "brush":
        drawStroke(ctx, figure);
        canvasState.pushStroke(figure);
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
        canvasState.pushStroke(figure);
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

  const drawStroke = (ctx, stroke) => {
    const points = stroke.points;
    if (!points || points.length === 0) return;

    ctx.save();
    ctx.strokeStyle = stroke.strokeStyle || "#000000";
    ctx.lineWidth = stroke.lineWidth || 1;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
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
    axios.post(`https://paint-online-back.onrender.com/image?id=${params.id}`, {
      img: canvasRef.current.toDataURL(),
    });
  };

  const handleCreateRoomClick = () => {
    setModal(true);
    setIsRoomCreated(true);
  };

  const updateCursor = (tool) => {
    const canvas = canvasRef.current;
    canvas.classList.remove("brush-cursor", "eraser-cursor", "rect-cursor", "circle-cursor", "line-cursor");
    canvas.classList.add(`${tool}-cursor`);
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
