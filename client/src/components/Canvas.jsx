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

  const updateCursor = (tool) => {
    const canvas = canvasRef.current;
    canvas.classList.remove("brush-cursor", "eraser-cursor");

    if (tool === "brush") {
        canvas.classList.add("brush-cursor");
    } else if (tool === "eraser") {
        canvas.classList.add("eraser-cursor");
    }
};

  const adjustCanvasSize = () => {
    const canvas = canvasRef.current;
    const aspectRatio = 600 / 400; // Пропорции холста: ширина/высота

    if (window.innerWidth < 768) { // Мобильные устройства
        canvas.width = window.innerWidth; // Полная ширина экрана
        canvas.height = window.innerWidth / aspectRatio; // Высота вычисляется пропорционально
    } else {
        canvas.width = 600; // Стандартная ширина для десктопа
        canvas.height = 400; // Стандартная высота для десктопа
    }
    canvasState.setCanvas(canvas);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height); // Заполняем холст белым фоном
};

  useEffect(() => {
    adjustCanvasSize(); // Устанавливаем размеры при загрузке компонента
    window.addEventListener("resize", adjustCanvasSize); // Реакция на изменение размера окна

    return () => {
        window.removeEventListener("resize", adjustCanvasSize); // Удаляем обработчик при размонтировании
    };
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
    toolState.setTool(new Brush(canvasRef.current, null, params.id));
    updateCursor("brush");
  }, [params.id]);

  useEffect(() => {
    if (canvasState.username) {
      if (toolState.tool && toolState.tool.destroyEvents) {
        toolState.tool.destroyEvents();
      }
      const socket = new WebSocket("wss://paint-online-back.onrender.com/");
      canvasState.setSocket(socket);
      canvasState.setSessionId(params.id);
      toolState.setTool(new Brush(canvasState.canvas, canvasState.socket, canvasState.sessionid));
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
        if (!msg.username) {
          return;
        }
        if (msg.username === canvasState.username) return;
        switch (msg.method) {
          case "draw":
            drawHandler(msg);
            break;
          case "finish":
            canvasRef.current.getContext("2d").beginPath();
            break;
          case "connection":
            setMessages((prevMessages) => [...prevMessages, `${msg.username} вошел в комнату`]);
            break;
          default:
            console.warn("Неизвестный метод:", msg.method);
            break;
        }
      };
    }
  }, [canvasState.username, params.id]);

  const drawHandler = (msg) => {
    const figure = msg.figure;
    const ctx = canvasRef.current.getContext("2d");
    if (msg.username === canvasState.username) return;

    switch (figure.type) {
      case "brush":
        Brush.staticDraw(ctx, figure.x, figure.y, figure.lineWidth, figure.strokeStyle, figure.isStart);
        break;
      case "rect":
        Rect.staticDraw(ctx, figure.x, figure.y, figure.width, figure.height, figure.fillStyle, figure.lineWidth, figure.strokeStyle);
        break;
      case "circle":
        Circle.staticDraw(ctx, figure.x, figure.y, figure.r, figure.fillStyle, figure.lineWidth, figure.strokeStyle);
        break;
      case "eraser":
        Eraser.staticDraw(ctx, figure.x, figure.y, figure.lineWidth, "#FFFFFF", figure.isStart);
        break;
      case "line":
        Line.staticDraw(ctx, figure.x, figure.y, figure.x2, figure.y2, figure.lineWidth, figure.strokeStyle);
        break;
      case "finish":
        ctx.beginPath();
        break;
      default:
        console.warn("Неизвестный тип фигуры:", figure.type);
        break;
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
    axios.post(`https://paint-online-back.onrender.com/image?id=${params.id}`, { img: canvasRef.current.toDataURL() })
      .then(response => console.log(response.data));
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
          <input type="text" ref={usernameRef} placeholder="Ваше имя" />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={connectHandler}>
            Войти
          </Button>
        </Modal.Footer>
      </Modal>

      <canvas ref={canvasRef} style={{ border: '1px solid black' }} />
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
