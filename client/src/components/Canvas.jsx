import React, { useEffect, useRef, useState } from "react";
import { Modal, Button } from "react-bootstrap";
import { observer } from "mobx-react-lite";
import { useParams } from "react-router-dom";
import canvasState from "../store/canvasState";
import toolState from "../store/toolState";
import Brush from "../tools/Brush";
import "../styles/canvas.scss";

const Canvas = observer(() => {
  const canvasRef = useRef();
  const usernameRef = useRef();
  const [modal, setModal] = useState(false);
  const [isRoomCreated, setIsRoomCreated] = useState(false);
  const params = useParams();

  useEffect(() => {
    canvasState.setCanvas(canvasRef.current);
    canvasState.setCanvasContainer(canvasRef.current.parentElement);
    canvasRef.current.width = 600;
    canvasRef.current.height = 400;

    const brush = new Brush(canvasRef.current);
    toolState.setTool(brush, "brush");
    brush.listen();
  }, []);

  const connectHandler = () => {
    const name = usernameRef.current.value.trim();
    if (name) {
      canvasState.setUsername(name);
      canvasState.setSessionId(params.id);
      setModal(false);
    }
  };

  const handleCreateRoomClick = () => {
    setModal(true);
    setIsRoomCreated(true);
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

      <div className="canvas-container">
        <canvas ref={canvasRef} />
      </div>

      {!isRoomCreated && (
        <Button variant="primary" onClick={handleCreateRoomClick} style={{ marginTop: "10px" }}>
          Создать комнату
        </Button>
      )}
    </div>
  );
});

export default Canvas;
