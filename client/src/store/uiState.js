import { makeAutoObservable } from "mobx";

/**
 * UIState - manages UI state (modals, interface visibility)
 * Responsibilities: modal states, room interface, about modal
 */
class UIState {
  modalOpen = false;
  showRoomInterface = false;
  showAboutModal = false;
  roomModalOpen = false;
  roomMode = 'create';
  publicRooms = [];
  createdRoomId = null;
  createdRoomLink = '';

  constructor() {
    makeAutoObservable(this);
  }

  setModalOpen(val) {
    this.modalOpen = val;
  }

  setShowRoomInterface(val) {
    this.showRoomInterface = val;
  }

  setShowAboutModal(val) {
    this.showAboutModal = val;
  }

  setRoomModalOpen(val) {
    this.roomModalOpen = val;
  }

  setRoomMode(mode) {
    this.roomMode = mode;
  }

  setPublicRooms(rooms) {
    this.publicRooms = rooms;
  }

  setCreatedRoomId(id) {
    this.createdRoomId = id;
  }

  setCreatedRoomLink(link) {
    this.createdRoomLink = link;
  }

  reset() {
    this.modalOpen = false;
    this.showRoomInterface = false;
    this.showAboutModal = false;
    this.roomModalOpen = false;
    this.roomMode = 'create';
    this.publicRooms = [];
    this.createdRoomId = null;
    this.createdRoomLink = '';
  }
}

const uiState = new UIState();
export default uiState;
