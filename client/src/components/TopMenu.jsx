import React, { useEffect } from 'react';
import { observer } from "mobx-react-lite";
import { useParams, useNavigate } from "react-router-dom";
import axios from 'axios';
import canvasState, { API_URL, WS_URL } from '../store/canvasState';
import toolState from '../store/toolState';
import Brush from '../tools/Brush';

const TopMenu = observer(() => {
  const navigate = useNavigate();

  useEffect(() => {
    if (canvasState.currentRoomId && !canvasState.isConnected) {
      axios.get(`${API_URL}/rooms/${canvasState.currentRoomId}/exists`)
        .then(response => {
          if (response.data.exists) {
            canvasState.setModalOpen(true);
          } else {
            navigate('/');
          }
        })
        .catch(() => navigate('/'));
    }
  }, [canvasState.currentRoomId, navigate]);

  useEffect(() => {
    const connectToRoom = () => {
      const { username, currentRoomId: roomId, isConnected, canvas } = canvasState;
      
      if (!username || username === 'local' || !roomId || isConnected || !canvas) {
        return;
      }
      
      canvasState.setModalOpen(false);
      canvasState.setShowRoomInterface(false);
      canvasState.setIsConnected(true);
      canvasState.strokeList = [];
      canvasState.redoStacks.clear();
      canvasState.users = [];
      canvasState.chatMessages = [];
      canvasState.redrawCanvas();
      
      try {
        const socket = new WebSocket(WS_URL);
        canvasState.setSocket(socket);
        canvasState.setSessionId(roomId);
        toolState.setTool(new Brush(canvas, socket, roomId, username), "brush");
        
        socket.onopen = () => {
          socket.send(JSON.stringify({ id: roomId, username, method: "connection" }));
        };
        
        socket.onclose = (event) => {
          canvasState.setIsConnected(false);
          canvasState.strokeList = [];
          canvasState.redoStacks.clear();
          canvasState.redrawCanvas();
        };
        
        socket.onmessage = (event) => {
          canvasState.handleMessage(JSON.parse(event.data));
        };
      } catch (error) {
        canvasState.setIsConnected(false);
      }
    };

    if (canvasState.currentRoomId && canvasState.usernameReady && !canvasState.isConnected) {
      connectToRoom();
    }
  }, [canvasState.usernameReady, canvasState.isConnected, canvasState.currentRoomId]);

  const download = () => {
    const dataUrl = canvasState.canvas.toDataURL();
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = canvasState.sessionid + ".jpg";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="top-menu" data-nosnippet>
      <div className="top-menu__actions">
        <button className="toolbar__btn" onClick={() => canvasState.undo()}>
          <span className="icon undo"></span>
        </button>
        <button className="toolbar__btn" onClick={() => canvasState.redo()}>
          <span className="icon redo"></span>
        </button>
        <button className="toolbar__btn" onClick={download}>
          <span className="icon save"></span>
        </button>
        {!canvasState.isConnected && !canvasState.currentRoomId ? (
          <>
            <button
              className="create-room-btn"
              onClick={() => canvasState.setShowRoomInterface(true)}
            >
              Совместное рисование
            </button>
            <button
              className="create-room-btn about-btn"
              onClick={() => canvasState.setShowAboutModal(true)}
            >
              О программе
            </button>
          </>
        ) : canvasState.isConnected && (
          <button
            className="create-room-btn disconnect-room-btn"
            onClick={() => {canvasState.disconnect(); navigate('/');}}
          >
            Выйти из комнаты
          </button>
        )}
      </div>
    </div>
  );
});

export default TopMenu;
