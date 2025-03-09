import React, { useEffect, useRef, useState } from 'react';
import { Modal, Button } from "react-bootstrap";
import "../styles/canvas.scss";
import { observer } from "mobx-react-lite";
import canvasState from "../store/canvasState";
import toolState from "../store/toolState";
import Brush from "../tools/Brush";
import Circle from "../tools/Circle";
import Eraser from "../tools/Eraser";
import Line from "../tools/Line";
import Rect from "../tools/Rect";
import { useParams } from "react-router-dom";
import axios from 'axios';

const Canvas = observer(() => {
    const canvasRef = useRef();
    const canvasContainerRef = useRef();
    const usernameRef = useRef();
    const [modal, setModal] = useState(false);
    const [messages, setMessages] = useState([]);
    const [isRoomCreated, setIsRoomCreated] = useState(false);
    const params = useParams();

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = canvasContainerRef.current;

        const resizeCanvas = () => {
            const { width } = container.getBoundingClientRect();
            canvas.width = width;
            canvas.height = width / 1.5;
            canvasState.setCanvas(canvas);
            const ctx = canvas.getContext('2d');

            if (params.id) {
                axios.get(`https://paint-online-back.onrender.com/image?id=${params.id}`)
                .then(response => {
                        const img = new Image();
                        img.src = response.data;
                        img.onload = () => {
                            ctx.clearRect(0, 0, canvas.width, canvas.height);
                            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                        };
                    })
                    .catch(error => {
                        console.error("Ошибка загрузки изображения:", error);
                        ctx.fillStyle = "white";
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                    });
            } else {
                ctx.fillStyle = "white";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            toolState.setTool(new Brush(canvas, canvasState.socket, params.id));
        };

        resizeCanvas();
        window.addEventListener("resize", resizeCanvas);
        return () => window.removeEventListener("resize", resizeCanvas);
    }, [params.id]);

    useEffect(() => {
        if (canvasState.username) {
            const socket = new WebSocket("wss://paint-online-back.onrender.com/");
            canvasState.setSocket(socket);
            canvasState.setSessionId(params.id);
            toolState.setTool(new Brush(canvasRef.current, socket, params.id));

            socket.onopen = () => {
                socket.send(JSON.stringify({
                    id: params.id,
                    username: canvasState.username,
                    method: "connection"
                }));
            };

            socket.onmessage = (event) => {
                const msg = JSON.parse(event.data);
                if (msg.method === "connection") {
                    setMessages(prevMessages => [...prevMessages, `пользователь ${msg.username} присоединился`]);
                } else if (msg.method === "draw") {
                    drawHandler(msg);
                }
            };
        }
    }, [canvasState.username, params.id]);

    const drawHandler = (msg) => {
        const figure = msg.figure;
        const ctx = canvasRef.current.getContext('2d');

        switch (figure.type) {
            case "brush": Brush.staticDraw(ctx, figure.x, figure.y, figure.lineWidth, figure.strokeStyle); break;
            case "rect": Rect.staticDraw(ctx, figure.x, figure.y, figure.width, figure.height, figure.lineWidth, figure.strokeStyle, figure.color); break;
            case "circle": Circle.staticDraw(ctx, figure.x, figure.y, figure.r, figure.lineWidth, figure.strokeStyle, figure.color); break;
            case "eraser": Eraser.staticDraw(ctx, figure.x, figure.y, figure.lineWidth, figure.strokeStyle); break;
            case "line": Line.staticDraw(ctx, figure.x, figure.y, figure.x2, figure.y2, figure.lineWidth, figure.strokeStyle); break;
            case "finish": ctx.beginPath(); break;
            default: break;
        }
    };

    const mouseDownHandler = (e) => {
        if (toolState.tool) {
            toolState.tool.mouseDown = true;
            canvasState.pushToUndo(canvasRef.current.toDataURL());
        }
    };

    const mouseUpHandler = () => {
        if (toolState.tool) {
            toolState.tool.mouseDown = false;
            canvasState.socket && canvasState.socket.send(JSON.stringify({ method: 'draw', id: canvasState.sessionid, figure: { type: 'finish' } }));
        }
    };

    const mouseMoveHandler = (e) => {
        if (toolState.tool && toolState.tool.mouseDown) {
            const rect = canvasRef.current.getBoundingClientRect();
            toolState.tool.draw(e.clientX - rect.left, e.clientY - rect.top);
        }
    };

    const connectHandler = () => {
        const username = usernameRef.current.value.trim();
        if (username) {
            canvasState.setUsername(username);
            setModal(false);
        } else {
            alert("Введите имя");
        }
    };

    const handleCreateRoomClick = () => {
        setModal(true);
        setIsRoomCreated(true);
    };

    return (
        <div className="canvas-container" ref={canvasContainerRef}>
            <Modal show={modal} onHide={() => setModal(false)}>
                <Modal.Header closeButton><Modal.Title>Ваше имя</Modal.Title></Modal.Header>
                <Modal.Body><input type="text" ref={usernameRef} placeholder="Имя" /></Modal.Body>
                <Modal.Footer><Button onClick={connectHandler}>Войти</Button></Modal.Footer>
            </Modal>
            <canvas ref={canvasRef} onMouseDown={mouseDownHandler} onMouseUp={mouseUpHandler} onMouseMove={mouseMoveHandler} style={{ touchAction: "none" }} />
            {!isRoomCreated && <Button onClick={handleCreateRoomClick}>Создать комнату</Button>}
            <div>{messages.map((msg, i) => <div key={i}>{msg}</div>)}</div>
        </div>
    );
});

export default Canvas;