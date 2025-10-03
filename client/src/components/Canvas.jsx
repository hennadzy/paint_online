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
  const userPaths = useRef({}); // ← изоляция по пользователю

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
    toolState.setTool(new Brush(canvasRef.current, null, params.id), "brush");
    updateCursor("brush");
  }, [params.id]);

  useEffect(() => {
    if (canvasState.username) {
      if (toolState.tool?.destroyEvents) {
        toolState.tool.destroyEvents();
      }
      const socket = new WebSocket("wss://paint-online-back.onrender.com/");
      canvasState.setSocket(socket);
      canvasState.setSessionId(params.id);
      toolState.setTool(
        new Brush(canvasState.canvas, socket, params.id, canvasState.username),
        "brush"
      );

      updateCursor("brush");
      toolState.tool.listen();

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
          case "finish":
            drawHandler(msg); // ← сбрасываем путь
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
    if (msg.username === canvasState.username) return;

    if (!userPaths.current[msg.username]) {
      userPaths.current[msg.username] = { active: false };
    }

    switch (figure.type) {
      case "brush":
        if (figure.isStart || !userPaths.current[msg.username].active) {
          ctx.beginPath();
          ctx.moveTo(figure.x, figure.y);
          userPaths.current[msg.username].active = true;
        } else {
          // ctx.lineTo(figure.x, figure.y);
          ctx.strokeStyle = figure.strokeStyle;
          ctx.lineWidth = figure.lineWidth;
          ctx.lineCap = "round";
          ctx.lineTo(figure.x, figure.y);
          ctx.stroke();
          ctx.beginPath();

          // ctx.stroke();
        }
        break;

      case "eraser":
        if (figure.isStart || !userPaths.current[msg.username].active) {
          ctx.beginPath();
          ctx.moveTo(figure.x, figure.y);
          userPaths.current[msg.username].active = true;
        } else {
          ctx.lineTo(figure.x, figure.y);
          ctx.strokeStyle = "#FFFFFF";
          ctx.lineWidth = figure.lineWidth ?? toolState.tool.lineWidth;
          ctx.lineCap = "round";
          ctx.stroke();
        }
        break;

      case "finish":
        userPaths.current[msg.username].active = false;
        ctx.beginPath();
        break;

      case "rect":
        ctx.beginPath();
        ctx.strokeStyle = figure.strokeStyle;
        ctx.lineWidth = figure.lineWidth;
        ctx.rect(figure.x, figure.y, figure.width, figure.height);
        ctx.stroke();
        break;

      case "circle":
        ctx.beginPath();
        ctx.strokeStyle = figure.strokeStyle;
        ctx.lineWidth = figure.lineWidth;
        ctx.arc(figure.x, figure.y, figure.radius, 0, 2 * Math.PI);
        ctx.stroke();
        break;

      case "line":
        ctx.beginPath();
        ctx.strokeStyle = figure.strokeStyle;
        ctx.lineWidth = figure.lineWidth;
        ctx.moveTo(figure.x1, figure.y1);
        ctx.lineTo(figure.x2, figure.y2);
        ctx.stroke();
        break;

      default:
        console.warn("Неизвестный тип фигуры:", figure.type);
    }
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

      <canvas ref={canvasRef} onMouseDown={mouseDownHandler} style={{ border: "1px solid black" }} />
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
