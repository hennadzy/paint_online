
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

    const [canvasWidth, setCanvasWidth] = useState(600); // Начальная ширина канваса
    const [canvasHeight, setCanvasHeight] = useState(400); // Начальная высота канваса

    useEffect(() => {
        const handleResize = () => {
            // Вычисляем новую ширину канваса (например, 100% ширины экрана)
            const newWidth = window.innerWidth * 0.95; // 95% ширины экрана, чтобы был небольшой отступ
            const newHeight = newWidth * (400 / 600); // Сохраняем пропорции

            setCanvasWidth(newWidth);
            setCanvasHeight(newHeight);
        };

        // Вызываем handleResize при монтировании компонента и при изменении размера окна
        handleResize();
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);


    useEffect(() => {
        canvasState.setCanvas(canvasRef.current)
        let ctx = canvasRef.current.getContext('2d')

        // Устанавливаем размеры канваса
        canvasRef.current.width = canvasWidth;
        canvasRef.current.height = canvasHeight;

        if (params.id) {
            axios.get(`https://paint-online-back.onrender.com/image?id=${params.id}`)
                .then(response => {
                    const img = new Image()
                    img.src = response.data
                    img.onload = () => {
                        ctx.clearRect(0, 0, canvasWidth, canvasHeight)
                        ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight)
                    }
                })
                .catch(error => console.error("Ошибка загрузки изображения:", error));
        } else {
            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        }

        toolState.setTool(new Brush(canvasRef.current, null, params.id));

    }, [params.id, canvasWidth, canvasHeight])

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
                        // Обновляем сообщения с информацией о присоединившемся пользователе
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

        // Получаем реальные размеры канваса
        const realWidth = canvasRef.current.offsetWidth;
        const realHeight = canvasRef.current.offsetHeight;

        // Вычисляем масштаб
        const scaleX = realWidth / 600;
        const scaleY = realHeight / 400;

        ctx.save(); // Сохраняем текущее состояние контекста

        // Масштабируем контекст
        ctx.scale(scaleX, scaleY);

        switch (figure.type) {
            case "brush":
                Brush.staticDraw(ctx, figure.x, figure.y, figure.lineWidth, figure.strokeStyle,)
                break
            case "rect":
                Rect.staticDraw(ctx, figure.x, figure.y, figure.width, figure.height, figure.color, figure.lineWidth, figure.strokeStyle)
                break
            case "circle":
                Circle.staticDraw(ctx, figure.x, figure.y, figure.r, figure.color, figure.lineWidth, figure.strokeStyle)
                break
            case "eraser":
                Eraser.staticDraw(ctx, figure.x, figure.y, figure.lineWidth, figure.strokeStyle)
                break
            case "line":
                Line.staticDraw(ctx, figure.x, figure.y, figure.x2, figure.y2, figure.lineWidth, figure.strokeStyle)
                break
            case "finish":
                ctx.beginPath()
                break
        }
        ctx.restore(); // Восстанавливаем состояние контекста
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
        setModal(true); // Показываем модальное окно при клике на "Создать комнату"
    };

    const mouseUpHandler = () => {
        toolState.tool.mouseDown = false; // Прекращаем рисование
        let ctx = canvasRef.current.getContext('2d') // Заканчиваем отрисовку
        ctx.beginPath()

    }

const mouseMoveHandler = (e) => {
        if (toolState.tool.mouseDown) {
            // Получаем реальные размеры канваса
            const realWidth = canvasRef.current.offsetWidth;
            const realHeight = canvasRef.current.offsetHeight;

            // Вычисляем масштаб
            const scaleX = 600 / realWidth;
            const scaleY = 400 / realHeight;

            // Получаем координаты мыши относительно канваса
            const x = (e.pageX - e.target.offsetLeft) * scaleX;
            const y = (e.pageY - e.target.offsetTop) * scaleY;

            toolState.tool.draw(x, y);

        }
    }

    return (
        <div className="canvas" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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
                onMouseDown={mouseDownHandler}
                onMouseUp={mouseUpHandler}
                onMouseMove={mouseMoveHandler}
                ref={canvasRef}
                width={canvasWidth}  // Используем динамическую ширину
                height={canvasHeight} // Используем динамическую высоту
                style={{ border: '1px solid black', width: '100%', maxWidth: '600px' }}
            />

            {/* Кнопка "Создать комнату" */}
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
