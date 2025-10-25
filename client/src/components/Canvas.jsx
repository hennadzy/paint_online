import React, { useEffect, useRef, useState } from "react";
import { Modal, Button } from "react-bootstrap";
import { observer } from "mobx-react-lite";
import { useParams } from "react-router-dom";
import canvasState from "../store/canvasState";
import toolState from "../store/toolState";
import strokeManager from "../store/StrokeManager";
import Brush from "../tools/Brush";
import "../styles/canvas.scss";

const Canvas = observer(() => {
  const containerRef = useRef();
  const usernameRef = useRef();
  const [modal, setModal] = useState(false);
  const [messages, setMessages] = useState([]);
  const params = useParams();

  useEffect(() => {
    canvasState.setCanvasContainer(containerRef.current);
    window.addEventListener("resize", resizeAllLayers);
    return () => window.removeEventListener("resize", resizeAllLayers);
  }, []);

  useEffect(() => {
    if (canvasState.username) {
      const socket = new WebSocket("wss://paint-online-back.onrender.com/");
      canvasState.setSocket(socket);
      canvasState.setSessionId(params.id);

      socket.onopen = () => {
        socket.send(JSON.stringify({
          id: params.id,
          username: canvasState.username,
          method: "connection"
        }));
        canvasState.createLayerForUser(canvasState.username);
        const brush = new Brush(canvasState.currentLayer, socket, params.id, canvasState.username);
        toolState.setTool(brush, "brush");
        brush.listen();
      };

      socket.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (!msg.username || msg.username === canvasState.username) return;

        switch (msg.method) {
          case "connection":
            canvasState.createLayerForUser(msg.username);
            setMessages(prev => [...prev, `${msg.username} вошел в комнату`]);
            break;
          case "draw":
            handleDraw(msg);
            break;
          case "undo":
            strokeManager.undo(msg.username);
            redrawLayer(msg.username);
            break;
          case "redo":
            strokeManager.redo(msg.username);
            redrawLayer(msg.username);
            break;
          default:
            console.warn("Неизвестный метод:", msg.method);
        }
      };
    }
  }, [canvasState.username]);

  const resizeAllLayers = () => {
    const container = containerRef.current;
    const width = container.offsetWidth;
    const height = container.offsetHeight;
    canvasState.layers.forEach((canvas) => {
      canvas.width = width;
      canvas.height = height;
    });
  };

  const handleDraw = (msg) => {
    const layer = canvasState.getLayer(msg.username);
    if (!layer) return;
    const ctx = layer.getContext("2d");
    const stroke = msg.stroke;

    strokeManager.addStroke(msg.username, stroke);
    drawStroke(ctx, stroke);
  };

  const drawStroke = (ctx, stroke) => {
    ctx.save();
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    const points = stroke.points;
    if (points.length > 0) {
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();
    }
    ctx.restore();
  };

  const redrawLayer = (username) => {
    const layer = canvasState.getLayer(username);
    if (!layer) return;
    const ctx = layer.getContext("2d");
    ctx.clearRect(0, 0, layer.width, layer.height);
    const strokes = strokeManager.getStrokes(username);
    strokes.forEach((stroke) => drawStroke(ctx, stroke));
  };

  const connectHandler = () => {
    const name = usernameRef.current.value.trim();
    if (name) {
      canvasState.setUsername(name);
      setModal(false);
    }
  };

  return (
    <div className="canvas">
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

      <div ref={containerRef} className="canvas-container" style={{ position: "relative", width: "100%", height: "100vh" }} />

      <div style={{ marginTop: "10px", textAlign: "center" }}>
        {messages.map((msg, i) => <div key={i}>{msg}</div>)}
      </div>
    </div>
  );
});

export default Canvas;
