
import React, {useEffect, useRef, useState} from 'react';
import  {Modal, Button} from "react-bootstrap";
import "../styles/canvas.scss"
import {observer} from "mobx-react-lite";
import canvasState from "../store/canvasState";
import toolState from "../store/toolState";
import Brush from "../tools/Brush";
import Circle from "../tools/Circle";
import Eraser from "../tools/Eraser";
import Line from "../tools/Line";
import {useParams} from "react-router-dom"
import Rect from "../tools/Rect";
import axios from 'axios'

const Canvas = observer(() => {
    const canvasRef = useRef()
    const usernameRef = useRef()
    const [modal, setModal] = useState(false)
    const params = useParams()
    const [messages, setMessages] = useState([]);

    const [canvasWidth, setCanvasWidth] = useState(600);
    const [canvasHeight, setCanvasHeight] = useState(400);

    useEffect(() => {
        const handleResize = () => {
            const newWidth = window.innerWidth * 0.95;
            const newHeight = newWidth * (400 / 600);

            setCanvasWidth(newWidth);
            setCanvasHeight(newHeight);
        };

        handleResize();
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        canvasState.setCanvas(canvas);

        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        if (params.id) {
            axios.get(`https://paint-online-back.onrender.com/image?id=${params.id}`)
                .then(response => {
                    const img = new Image();
                    img.src = response.data;
                    img.onload = () => {
                        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
                        ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
                    };
                })
                .catch(error => console.error("Ошибка загрузки изображения:", error));
        } else {
            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        }

        toolState.setTool(new Brush(canvasRef.current, null, params.id));

    }, [params.id, canvasWidth, canvasHeight]);

    useEffect(() => {
        if (canvasState.username) {
            const socket = new WebSocket("wss://paint-online-back.onrender.com/");
            canvasState.setSocket(socket)
            canvasState.setSessionId(params.id)
            toolState.setTool(new Brush(canvasRef.current, socket, params.id))
            socket.onopen = () => {
                console.log('Подключение установлено')
                socket.send(JSON.stringify({
                    id:params.id,
                    username: canvasState.username,
                    method: "connection"
                }))
            }
            socket.onmessage = (event) => {
                let msg = JSON.parse(event.data)
                switch (msg.method) {
                    case "connection":
                        setMessages(prevMessages => [...prevMessages, `пользователь ${msg.username} присоединился`]);
                        break
                    case "draw":
                        drawHandler(msg)
                        break
                }
            }
        }
    }, [canvasState.username, params.id])

    const drawHandler = (msg) => {
        const figure = msg.figure
        const ctx = canvasRef.current.getContext('2d')

        switch (figure.type) {
            case "brush":
                Brush.staticDraw(ctx, figure.x, figure.y, figure.lineWidth, figure.color)
                break
            case "rect":
                Rect.staticDraw(ctx, figure.x, figure.y, figure.width, figure.height, figure.color, figure.fillColor)
                break
            case "circle":
                Circle.staticDraw(ctx, figure.x, figure.y, figure.r, figure.color, figure.fillColor)
                break
            case "eraser":
                Eraser.staticDraw(ctx, figure.x, figure.y, figure.lineWidth, 'white')
                break
            case "line":
                Line.staticDraw(ctx, figure.x, figure.y, figure.x2, figure.y2, figure.color, figure.lineWidth)
                break
        }
    }

    const mouseDownHandler = () => {
        canvasState.pushToUndo(canvasRef.current.toDataURL())
        axios.post(`https://paint-online-back.onrender.com/image?id=${params.id}`, {img: canvasRef.current.toDataURL()})
            .then(response => console.log(response.data))
    }

    const connectHandler = () => {
        canvasState.setUsername(usernameRef.current.value)
        setModal(false)
    }

    const handleCreateRoomClick = () => {
        setModal(true);
    };

    const getMousePosition = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) * (canvasWidth / rect.width),
            y: (e.clientY - rect.top) * (canvasHeight / rect.height)
        };
    }

    const mouseUpHandler = () => {
        toolState.tool.mouseDown = false;
    }

    const mouseMoveHandler = (e) => {
        if (toolState.tool.mouseDown) {
            const {x, y} = getMousePosition(e);
            toolState.tool.draw(x, y);
        }
    }

    return (
        <div className="canvas">
            <Modal show={modal} onHide={() => setModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Введите ваше имя</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <input type="text" ref={usernameRef} placeholder="Ваше имя"/>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={connectHandler}>
                        Войти
                    </Button>
                </Modal.Footer>
            </Modal>

            <canvas
                onMouseDown={(e) => {
                    mouseDownHandler();
                    const {x, y} = getMousePosition(e);
                    toolState.tool.mouseDownHandler(x, y)
                }}
                onMouseUp={mouseUpHandler}
                onMouseMove={(e) => {
                    mouseMoveHandler(e)
                }}
                ref={canvasRef}
                width={canvasWidth}
                height={canvasHeight}
            />

            <Button variant="primary" onClick={handleCreateRoomClick} style={{ marginTop: '10px' }}>
                Создать комнату
            </Button>
            <div style={{ marginTop: '10px', textAlign: 'center' }}>
                {messages.map((message, index) => (
                    <div key={index}>{message}</div>
                ))}
            </div>
        </div>
    );
});

export default Canvas;
