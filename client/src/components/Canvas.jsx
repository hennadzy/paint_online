import React, { useEffect, useRef, useState } from "react";
import { observer } from "mobx-react-lite";
import canvasState from "../store/canvasState";
import toolState from "../store/toolState";
import Brush from "../tools/Brush";
import Rect from "../tools/Rect";
import Circle from "../tools/Circle";
import Eraser from "../tools/Eraser";
import Line from "../tools/Line";
import { Modal, Button } from "react-bootstrap";
import { useParams } from "react-router-dom";
import axios from "axios";

const Canvas = observer(() => {
  const canvasRef = useRef();
  const usernameRef = useRef();
  const [modal, setModal] = useState(true);
  const [isRoomCreated, setIsRoomCreated] = useState(false);
  const [messages, setMessages] = useState([]);
  const params = useParams();
  const activeUsersRef = useRef(new Map());

  useEffect(() => {
    canvasState.setCanvas(canvasRef.current);
    
    const ctx = canvasRef.current.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    // Загружаем сохраненное изображение если есть ID
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
        .catch(() => {
          console.log("Изображение не найдено");
        });
    }
  }, [params.id]);

  useEffect(() => {
    if (!canvasState.username || !params.id) return;

    const socket = new WebSocket("wss://paint-online-back.onrender.com/");
    
    canvasState.setSocket(socket);
    canvasState.setSessionId(params.id);

    socket.onopen = () => {
      console.log("Подключение установлено");
      socket.send(JSON.stringify({
        id: params.id,
        username: canvasState.username,
        method: "connection",
      }));
    };

    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      console.log("Получено сообщение:", msg); // ✅ Для отладки

      switch (msg.method) {
        case "draw":
          // ✅ Обрабатываем рисование от ВСЕХ пользователей (включая себя для синхронизации)
          drawHandler(msg);
          break;
        case "undo":
          console.log("Получен undo от:", msg.username, "actionId:", msg.actionId); // ✅ Для отладки
          // ✅ НЕ фильтруем свои сообщения - обрабатываем все
          canvasState.handleRemoteUndo(msg.actionId, msg.username);
          break;
        case "redo":
          console.log("Получен redo от:", msg.username, "actionId:", msg.actionId); // ✅ Для отладки  
          // ✅ НЕ фильтруем свои сообщения - обрабатываем все
          canvasState.handleRemoteRedo(msg.actionId, msg.username);
          break;
        case "connection":
         setMessages((prev) => [...prev, `${msg.username} вошел в комнату`]);
          break;
        default:
          console.warn("Неизвестный метод:", msg.method);
      }
    };

    socket.onerror = (error) => {
      console.error("Ошибка WebSocket:", error);
    };

    socket.onclose = () => {
      console.log("Соединение закрыто");
    };

    return () => {
      socket.close();
    };
  }, [canvasState.username, params.id]);

  useEffect(() => {
    if (!canvasState.canvas) return;

    const canvas = canvasState.canvas;
    
    switch (toolState.tool) {
      case "brush":
        toolState.setTool(new Brush(canvas, canvasState.socket, params.id, canvasState.username));
        break;
      case "rect":
        toolState.setTool(new Rect(canvas, canvasState.socket, params.id, canvasState.username));
        break;
        case "circle":
        toolState.setTool(new Circle(canvas, canvasState.socket, params.id, canvasState.username));
        break;
      case "eraser":
        toolState.setTool(new Eraser(canvas, canvasState.socket, params.id, canvasState.username));
        break;
      case "line":
        toolState.setTool(new Line(canvas, canvasState.socket, params.id, canvasState.username));
        break;
      default:
        break;
    }
  }, [toolState.tool, canvasState.canvas, canvasState.socket, params.id, canvasState.username]);

  const drawHandler = (msg) => {
    const figure = msg.figure;
    const ctx = canvasRef.current.getContext("2d");
    const username = msg.username;

    ctx.save();

    switch (figure.type) {
      case "brush":
        ctx.strokeStyle = figure.strokeStyle || "#000000";
        ctx.lineWidth = figure.lineWidth || 1;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        if (figure.isStart) {
          ctx.beginPath();
          ctx.moveTo(figure.x, figure.y);
          activeUsersRef.current.set(username, { 
            isDrawing: true, 
            lastX: figure.x, 
            lastY: figure.y,
            currentAction: {
              type: "brush",
              strokeStyle: figure.strokeStyle,
              lineWidth: figure.lineWidth,
              points: [{x: figure.x, y: figure.y}],
              author: username,
              id: Date.now() + Math.random() // ✅ Генерируем ID для входящих действий
            }
          });
        } else {
          const userState = activeUsersRef.current.get(username);
          if (userState && userState.isDrawing) {
            ctx.beginPath();
            ctx.moveTo(userState.lastX, userState.lastY);
            ctx.lineTo(figure.x, figure.y);
            ctx.stroke();
            
            if (userState.currentAction) {
              userState.currentAction.points.push({x: figure.x, y: figure.y});
            }
            
            activeUsersRef.current.set(username, { 
              isDrawing: true, 
              lastX: figure.x, 
              lastY: figure.y,
              currentAction: userState.currentAction
            });
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
          activeUsersRef.current.set(username, { 
            isDrawing: true, 
            lastX: figure.x, 
            lastY: figure.y,
            currentAction: {
              type: "eraser",
              lineWidth: figure.lineWidth,
              points: [{x: figure.x, y: figure.y}],
              author: username,
              id: Date.now() + Math.random() // ✅ Генерируем ID для входящих действий
            }
          });
        } else {
          const userState = activeUsersRef.current.get(username);
          if (userState && userState.isDrawing) {
            ctx.beginPath();
            ctx.moveTo(userState.lastX, userState.lastY);
            ctx.lineTo(figure.x, figure.y);
            ctx.stroke();
            
            if (userState.currentAction) {
              userState.currentAction.points.push({x: figure.x, y: figure.y});
            }
            
            activeUsersRef.current.set(username, { 
              isDrawing: true, 
              lastX: figure.x, 
              lastY: figure.y,
              currentAction: userState.currentAction
            });
          }
        }
        break;

      case "rect":
        ctx.beginPath();
        Rect.staticDraw(ctx, figure.x, figure.y, figure.width, figure.height, figure.strokeStyle, figure.lineWidth);
        
        // ✅ Сохраняем действия от других пользователей в общую историю
        if (username !== canvasState.username) {
          canvasState.addUserAction({
            type: "rect",
            x: figure.x,
            y: figure.y,
            width: figure.width,
            height: figure.height,
            strokeStyle: figure.strokeStyle,
            lineWidth: figure.lineWidth,
            author: username,
            id: Date.now() + Math.random()
          });
        }
        break;

      case "circle":
        ctx.beginPath();
        Circle.staticDraw(ctx, figure.x, figure.y, figure.radius, figure.strokeStyle, figure.lineWidth);
        
        // ✅ Сохраняем действия от других пользователей в общую историю
        if (username !== canvasState.username) {
          canvasState.addUserAction({
            type: "circle",
            x: figure.x,
            y: figure.y,
            radius: figure.radius,
            strokeStyle: figure.strokeStyle,
            lineWidth: figure.lineWidth,
            author: username,
            id: Date.now() + Math.random()
          });
        }
        break;

      case "line":
        ctx.beginPath();
        Line.staticDraw(ctx, figure.x1, figure.y1, figure.x2, figure.y2, figure.strokeStyle, figure.lineWidth);
        
        // ✅ Сохраняем действия от других пользователей в общую историю
        if (username !== canvasState.username) {
          canvasState.addUserAction({
            type: "line",
            x1: figure.x1,
            y1: figure.y1,
            x2: figure.x2,
            y2: figure.y2,
            strokeStyle: figure.strokeStyle,
            lineWidth: figure.lineWidth,
            author: username,
            id: Date.now() + Math.random()
          });
        }
        break;

      case "finish":
        const userState = activeUsersRef.current.get(username);
        if (userState && userState.currentAction) {
          // ✅ Сохраняем завершенные действия от других пользователей
          if (username !== canvasState.username) {
            canvasState.addUserAction(userState.currentAction);
          }
        }
        
        ctx.beginPath();
        activeUsersRef.current.delete(username);
        break;

      default:
        console.warn("Неизвестный тип фигуры:", figure.type);
    }

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
    if (!canvasState.username || !canvasState.socket) {
      canvasState.pushToUndo(canvasRef.current.toDataURL());
    }
    
    if (params.id) {
      axios.post(`https://paint-online-back.onrender.com/image?id=${params.id}`, {
        img: canvasRef.current.toDataURL(),
      });
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
        width={1000}
        height={600}
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