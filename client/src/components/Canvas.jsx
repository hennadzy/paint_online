import React, { useEffect, useRef, useState } from "react";
import { Modal, Button } from "react-bootstrap";
import { observer } from "mobx-react-lite";
import { useParams } from "react-router-dom";
import axios from "axios";
import canvasState from "../store/canvasState";
import toolState from "../store/toolState";
import Brush from "../tools/Brush";
import "../styles/canvas.scss";

const Canvas = observer(() => {
  const canvasRef = useRef();
  const usernameRef = useRef();
  const [modal, setModal] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isRoomCreated, setIsRoomCreated] = useState(false);
  const params = useParams();
  const userPaths = useRef({});

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = 600;
    canvas.height = 400;
    canvasState.setCanvas(canvas);

    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (params.id) {
      axios
        .get(`https://paint-online-back.onrender.com/image?id=${params.id}`)
        .then((res) => {
          const img = new Image();
          img.src = res.data;
          img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          };
        });
    }

    toolState.setTool(new Brush(canvas, null, params.id), "brush");
  }, [params.id]);

  useEffect(() => {
    if (!canvasState.username) return;

    const socket = new WebSocket("wss://paint-online-back.onrender.com/");
    canvasState.setSocket(socket);
    canvasState.setSessionId(params.id);

    const brush = new Brush(canvasState.canvas, socket, params.id, canvasState.username);
    toolState.setTool(brush, "brush");

    socket.onopen = () => {
      socket.send(JSON.stringify({
        method: "connection",
        username: canvasState.username,
        id: params.id
      }));
    };

    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (!msg.username || msg.username === canvasState.username) return;
      drawHandler(msg);
    };
  }, [canvasState.username, params.id]);

  const drawHandler = (msg) => {
const ctx = canvasRef.current.getContext("2d");
const { figure, username } = msg;

if (username === canvasState.username) return;

if (!userPaths.current[username]) {
  userPaths.current[username] = { active: false };
}

switch (figure.type) {
  case "brush": {
    if (figure.isStart || !userPaths.current[username].active) {
      ctx.beginPath();
      ctx.moveTo(figure.x, figure.y);
      userPaths.current[username].active = true;
    } else {
      ctx.lineTo(figure.x, figure.y);
    }

    ctx.strokeStyle = figure.strokeStyle;
    ctx.lineWidth = figure.lineWidth;
    ctx.lineCap = "round";
    ctx.stroke();
    break;
  }

  case "finish": {
    userPaths.current[username].active = false;
    ctx.beginPath(); // сброс пути
    break;
  }

      case "connection": {
        setMessages((prev) => [...prev, `${username} вошел в комнату`]);
        break;
      }

      default:
        console.warn("Неизвестный тип фигуры:", figure.type);
    }
  };

  const connectHandler = () => {
    const name = usernameRef.current.value.trim();
    if (name) {
      canvasState.setUsername(name);
      setModal(false);
    } else {
      alert("Введите имя");
    }
  };

  const mouseDownHandler = () => {
    canvasState.pushToUndo(canvasRef.current.toDataURL());
    axios.post(`https://paint-online-back.onrender.com/image?id=${params.id}`, {
      img: canvasRef.current.toDataURL()
    });
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
            onKeyDown={(e) => e.key === "Enter" && connectHandler()}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={connectHandler}>Войти</Button>
        </Modal.Footer>
      </Modal>

      <canvas ref={canvasRef} onMouseDown={mouseDownHandler} style={{ border: "1px solid black" }} />
      {!isRoomCreated && (
        <Button variant="primary" onClick={() => { setModal(true); setIsRoomCreated(true); }} style={{ marginTop: "10px" }}>
          Создать комнату
        </Button>
      )}

      <div style={{ marginTop: "10px", textAlign: "center" }}>
        {messages.map((msg, i) => <div key={i}>{msg}</div>)}
      </div>
    </div>
  );
});

export default Canvas;
