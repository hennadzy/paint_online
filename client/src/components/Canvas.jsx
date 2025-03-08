
import React, { useEffect, useRef, useState } from 'react';
import { Modal, Button } from "react-bootstrap";
import "../styles/canvas.scss"
import { observer } from "mobx-react-lite";
import canvasState from "../store/canvasState";
import toolState from "../store/toolState";
import Brush from "../tools/Brush";
import Circle from "../tools/Circle";
import Eraser from "../tools/Eraser";
import Line from "../tools/Line";
import { useParams } from "react-router-dom"
import Rect from "../tools/Rect";
import axios from 'axios'

const Canvas = observer(() => {
    const canvasRef = useRef()
    const usernameRef = useRef()
    const [modal, setModal] = useState(false)
    const params = useParams()
    const [messages, setMessages] = useState([]);

    const [canvasWidth, setCanvasWidth] = useState(600); // Initial canvas width
    const [canvasHeight, setCanvasHeight] = useState(400); // Initial canvas height

    useEffect(() => {
        const handleResize = () => {
            // Calculate new canvas width (e.g., 95% of the screen width)
            const newWidth = window.innerWidth * 0.95;
            const newHeight = newWidth * (400 / 600); // Maintain aspect ratio

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

        // Set canvas dimensions
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        // Fetch image if ID is present
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
                .catch(error => console.error("Image load error:", error));
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
                console.log('Connection established')
                socket.send(JSON.stringify({
                    id: params.id,
                    username: canvasState.username,
                    method: "connection"
                }))
            }
            socket.onmessage = (event) => {
                let msg = JSON.parse(event.data)
                switch (msg.method) {
                    case "connection":
                        // Update messages with information about the joined user
                        setMessages(prevMessages => [...prevMessages, `User ${msg.username} joined`]);
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
                if (figure.type === 'moveTo') {
                    Brush.moveTo(ctx, figure.x, figure.y, figure.color, figure.lineWidth);
                } else if (figure.type === 'lineTo') {
                    Brush.draw(ctx, figure.x, figure.y, figure.color, figure.lineWidth);
                } else if (figure.type === 'finish') {
                    Brush.finish(ctx);
                }
                break;
            case "rect":
                Rect.draw(ctx, figure.x, figure.y, figure.width, figure.height, figure.color, figure.fillColor)
                break
            case "circle":
                Circle.draw(ctx, figure.x, figure.y, figure.r, figure.color, figure.fillColor)
                break
            case "eraser":
                Eraser.draw(ctx, figure.x, figure.y, figure.lineWidth);
                break;
            case "line":
                Line.draw(ctx, figure.x, figure.y, figure.x2, figure.y2, figure.color, figure.lineWidth)
                break
        }
    }

    const mouseDownHandler = () => {
        canvasState.pushToUndo(canvasRef.current.toDataURL())
    }

    const connectionHandler = () => {
        setModal(false)
        canvasState.setUsername(usernameRef.current.value)
    }

    const download = () => {
        const dataURL = canvasRef.current.toDataURL()
        const link = document.createElement('a')
        link.href = dataURL
        link.download = "canvas_image.png";
        link.click()
    }

    return (
         <Modal show={modal} onHide={() => {}}>
             <Modal.Header>
             <Modal.Title>Enter your name</Modal.Title>
                 </Modal.Header>
              <Modal.Body>      
          </Modal.Body>
             <Modal.Footer>
                 <Button variant="primary" onClick={() => connectionHandler()}>
                 Join
                </Button>
            </Modal.Footer>
      </Modal>
          <canvas ref={canvasRef} width={canvasWidth} height={canvasHeight}
                onMouseDown={mouseDownHandler}
          className="canvas"/>
    );
});

export default Canvas;
