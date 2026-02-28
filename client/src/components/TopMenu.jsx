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
    if (canvasState.currentRoomId && !canvasState.isConnected && !canvasState.modalOpen) {
      const timer = setTimeout(() => {
        axios.get(`${API_URL}/rooms/${canvasState.currentRoomId}/exists`)
          .then(response => {
            if (response.data.exists) {
              canvasState.setModalOpen(true);
            } else {
              navigate('/404', { replace: true });
            }
          })
          .catch(() => navigate('/404', { replace: true }));
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [canvasState.currentRoomId, navigate]);

  useEffect(() => {
    const connectToRoom = async () => {
      const { username, currentRoomId: roomId, isConnected, canvas } = canvasState;
      
      if (!username || username === 'local' || !roomId || isConnected || !canvas) {
        return;
      }
      
      const token = localStorage.getItem(`room_token_${roomId}`);
      
      if (!token) {
        canvasState.setModalOpen(true);
        return;
      }
      
      canvasState.setModalOpen(false);
      canvasState.setShowRoomInterface(false);
      
      try {
        await canvasState.connectToRoom(roomId, username, token);
      } catch (error) {
        localStorage.removeItem(`room_token_${roomId}`);
        canvasState.setIsConnected(false);
        canvasState.setModalOpen(true);
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
    a.download = (canvasState.sessionId || 'drawing') + '.jpg';
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
            <button
              className="create-room-btn about-btn"
              onClick={() => canvasState.setShowFeedbackModal(true)}
            >
              Обратная связь
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
