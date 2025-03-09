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
    // Не создаем Brush без сокета – создаем его только когда введут имя
    // toolState.setTool(new Brush(canvasRef.current, null, params.id));
  }, [params.id]);

  useEffect(() => {
    if (canvasState.username) {
      // Если уже есть инструмент, удаляем его обработчики, чтобы не оставалось дублирования
      if (toolState.tool && toolState.tool.destroyEvents) {
        toolState.tool.destroyEvents();
      }
      const socket = new WebSocket("wss://paint-online-back.onrender.com/");
      canvasState.setSocket(socket);
      canvasState.setSessionId(params.id);
      // Создаем кисть только один раз
    //   const brushTool = new Brush(canvasRef.current, socket, params.id);
    //   brushTool.username = canvasState.username;
    //   toolState.setTool(brushTool);

      socket.onopen = () => {
        console.log("Подключение установлено");
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
        // Фильтруем echo-сообщения
        if (msg.username && msg.username === canvasState.username) {
          return;
        }
        switch (msg.method) {
          case "connection":
            setMessages(prevMessages => [...prevMessages, `пользователь ${msg.username} присоединился`]);
            break;
          case "draw":
            drawHandler(msg);
            break;
          default:
            break;
        }
      };
    }
  }, [canvasState.username, params.id]);

  const drawHandler = (msg) => {
    const figure = msg.figure;
    const ctx = canvasRef.current.getContext("2d");
    switch (figure.type) {
      case "brush":
        Brush.staticDraw(ctx, figure.x, figure.y, figure.lineWidth, figure.strokeStyle, figure.isStart);
        break;
      case "rect":
        Rect.staticDraw(ctx, figure.x, figure.y, figure.width, figure.height, figure.color, figure.lineWidth, figure.strokeStyle);
        break;
      case "circle":
        Circle.staticDraw(ctx, figure.x, figure.y, figure.r, figure.color, figure.lineWidth, figure.strokeStyle);
        break;
      case "eraser":
        Eraser.staticDraw(ctx, figure.x, figure.y, figure.lineWidth, figure.strokeStyle, figure.isStart);
        break;
      case "line":
        Line.staticDraw(ctx, figure.x, figure.y, figure.x2, figure.y2, figure.lineWidth, figure.strokeStyle);
        break;
      case "finish":
        ctx.beginPath();
        break;
      default:
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

      <canvas ref={canvasRef} width={600} height={400} style={{ border: "1px solid black" }} />

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