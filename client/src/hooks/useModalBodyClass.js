import { useEffect } from 'react';
import canvasState from '../store/canvasState';

export function useModalBodyClass() {
  useEffect(() => {
    const isModalOpen = canvasState.showAboutModal || canvasState.showFeedbackModal || canvasState.showRoomInterface ||
      canvasState.modalOpen || canvasState.showRestoreDialog;
    if (isModalOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => document.body.classList.remove('modal-open');
  }, [canvasState.showAboutModal, canvasState.showFeedbackModal, canvasState.showRoomInterface, canvasState.modalOpen, canvasState.showRestoreDialog]);
}
