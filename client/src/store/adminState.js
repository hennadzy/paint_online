import { makeAutoObservable, runInAction } from 'mobx';
import axios from 'axios';
import { API_URL } from './canvasState';

class AdminState {
  stats = null;

  users = [];
  usersPagination = { page: 1, limit: 20, total: 0, totalPages: 0 };
  usersLoading = false;
  usersError = null;

  rooms = [];
  roomsPagination = { page: 1, limit: 20, total: 0, totalPages: 0 };
  roomsLoading = false;
  roomsError = null;

  selectedRoom = null;
  roomDetailsLoading = false;

  selectedUser = null;
  userDetailsLoading = false;

  activeTab = 'dashboard';
  searchQuery = '';

  usersSortBy = 'created_at';
  usersSortOrder = 'DESC';
  roomsSortBy = 'last_activity';
  roomsSortOrder = 'DESC';

  filters = {};

  showUserModal = false;
  showRoomModal = false;
  showDeleteConfirm = false;
  showPasswordModal = false;
  deleteTarget = null;
  modalMode = 'edit';


  coloringPages = [];
  coloringPagesLoading = false;
  coloringPagesError = null;

  galleryPending = [];
  galleryPendingLoading = false;
  galleryPendingError = null;

  constructor() {
    makeAutoObservable(this);
  }

  setActiveTab(tab) {
    this.activeTab = tab;
    if (tab === 'users') {
      this.fetchUsers();
    } else if (tab === 'rooms') {
      this.fetchRooms();
    }
  }

  setSearchQuery(query) {
    this.searchQuery = query;
  }

  setSort(sortBy, sortOrder, type = 'users') {
    if (type === 'users') {
      this.usersSortBy = sortBy;
      this.usersSortOrder = sortOrder;
    } else {
      this.roomsSortBy = sortBy;
      this.roomsSortOrder = sortOrder;
    }
  }

  setFilters(filters) {
    this.filters = filters;
  }

  async fetchStats() {
    try {
      const response = await axios.get(`${API_URL}/api/admin/stats`);
      runInAction(() => {
        this.stats = response.data;
      });
    } catch (error) {
      console.error('Fetch admin stats error:', error);
    }
  }

  async fetchUsers(page = 1) {
    this.usersLoading = true;
    this.usersError = null;
    try {
      const response = await axios.get(`${API_URL}/api/admin/users`, {
        params: {
          page,
          limit: this.usersPagination.limit,
          search: this.searchQuery,
          sortBy: this.usersSortBy,
          sortOrder: this.usersSortOrder,
          ...this.filters
        }
      });
      runInAction(() => {
        this.users = response.data.users;
        this.usersPagination = response.data.pagination;
        this.usersLoading = false;
      });
    } catch (error) {
      runInAction(() => {
        this.usersError = error.response?.data?.error || 'Failed to load users';
        this.usersLoading = false;
      });
    }
  }

  async fetchUserDetails(userId) {
    this.userDetailsLoading = true;
    try {
      const response = await axios.get(`${API_URL}/api/admin/users/${userId}`);
      runInAction(() => {
        this.selectedUser = response.data.user;
        this.userDetailsLoading = false;
      });
    } catch (error) {
      runInAction(() => {
        this.userDetailsLoading = false;
      });
    }
  }

  async updateUser(userId, data) {
    try {
      const response = await axios.put(`${API_URL}/api/admin/users/${userId}`, data);
      runInAction(() => {
        const index = this.users.findIndex(u => u.id === userId);
        if (index !== -1) {
          this.users[index] = response.data.user;
        }
        this.showUserModal = false;
        this.selectedUser = null;
      });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to update user'
      };
    }
  }

  async deleteUser(userId) {
    try {
      await axios.delete(`${API_URL}/api/admin/users/${userId}`);
      runInAction(() => {
        this.users = this.users.filter(u => u.id !== userId);
        this.showDeleteConfirm = false;
        this.deleteTarget = null;
      });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to delete user'
      };
    }
  }

  async toggleUserActive(userId) {
    try {
      const response = await axios.post(`${API_URL}/api/admin/users/${userId}/toggle-active`);
      runInAction(() => {
        const index = this.users.findIndex(u => u.id === userId);
        if (index !== -1) {
          this.users[index] = response.data.user;
        }
      });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to toggle user status'
      };
    }
  }

  async changeUserPassword(userId, newPassword) {
    try {
      await axios.post(`${API_URL}/api/admin/users/${userId}/change-password`, {
        newPassword
      });
      runInAction(() => {
        this.showPasswordModal = false;
      });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to change password'
      };
    }
  }

  async fetchRooms(page = 1) {
    this.roomsLoading = true;
    this.roomsError = null;
    try {
      const response = await axios.get(`${API_URL}/api/admin/rooms`, {
        params: {
          page,
          limit: this.roomsPagination.limit,
          search: this.searchQuery,
          sortBy: this.roomsSortBy,
          sortOrder: this.roomsSortOrder,
          ...this.filters
        }
      });
      runInAction(() => {
        this.rooms = response.data.rooms;
        this.roomsPagination = response.data.pagination;
        this.roomsLoading = false;
      });
    } catch (error) {
      runInAction(() => {
        this.roomsError = error.response?.data?.error || 'Failed to load rooms';
        this.roomsLoading = false;
      });
    }
  }

  async fetchRoomDetails(roomId) {
    this.roomDetailsLoading = true;
    try {
      const response = await axios.get(`${API_URL}/api/admin/rooms/${roomId}`);
      runInAction(() => {
        this.selectedRoom = response.data.room;
        this.roomDetailsLoading = false;
      });
    } catch (error) {
      runInAction(() => {
        this.roomDetailsLoading = false;
      });
    }
  }

  async updateRoom(roomId, data) {
    try {
      await axios.put(`${API_URL}/api/admin/rooms/${roomId}`, data);
      runInAction(() => {
        const index = this.rooms.findIndex(r => r.id === roomId);
        if (index !== -1) {
          this.rooms[index] = { ...this.rooms[index], ...data };
        }
        this.showRoomModal = false;
        this.selectedRoom = null;
      });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to update room'
      };
    }
  }

  async deleteRoom(roomId) {
    try {
      await axios.delete(`${API_URL}/api/admin/rooms/${roomId}`);
      runInAction(() => {
        this.rooms = this.rooms.filter(r => r.id !== roomId);
        this.showDeleteConfirm = false;
        this.deleteTarget = null;
      });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to delete room'
      };
    }
  }

  async joinRoom(roomId) {
    try {
      const response = await axios.post(`${API_URL}/api/admin/rooms/${roomId}/join`, {
        username: 'Admin'
      });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to join room'
      };
    }
  }

  async exportUsers(format = 'json') {
    try {
      const response = await axios.get(`${API_URL}/api/admin/export/users`, {
        params: { format },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `users.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to export users'
      };
    }
  }

  async exportRooms(format = 'json') {
    try {
      const response = await axios.get(`${API_URL}/api/admin/export/rooms`, {
        params: { format },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `rooms.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to export rooms'
      };
    }
  }

  openUserModal(user = null) {
    this.selectedUser = user;
    this.modalMode = user ? 'edit' : 'create';
    this.showUserModal = true;
  }

  closeUserModal() {
    this.showUserModal = false;
    this.selectedUser = null;
  }

  openRoomModal(room = null) {
    this.selectedRoom = room;
    this.modalMode = room ? 'edit' : 'create';
    this.showRoomModal = true;
  }

  closeRoomModal() {
    this.showRoomModal = false;
    this.selectedRoom = null;
  }

  openDeleteConfirm(target) {
    this.deleteTarget = target;
    this.showDeleteConfirm = true;
  }

  closeDeleteConfirm() {
    this.showDeleteConfirm = false;
    this.deleteTarget = null;
  }

  openPasswordModal(user) {
    this.selectedUser = user;
    this.showPasswordModal = true;
  }

  closePasswordModal() {
    this.showPasswordModal = false;
    this.selectedUser = null;
  }

  changePage(type, page) {
    if (type === 'users') {
      this.fetchUsers(page);
    } else if (type === 'rooms') {
      this.fetchRooms(page);
    }
  }



  async fetchColoringPages() {
    this.coloringPagesLoading = true;
    this.coloringPagesError = null;
    try {
      const response = await axios.get(`${API_URL}/api/admin/game-modes/coloring`);
      runInAction(() => {
        this.coloringPages = response.data.pages;
        this.coloringPagesLoading = false;
      });
    } catch (error) {
      runInAction(() => {
        this.coloringPagesError = error.response?.data?.error || 'Ошибка загрузки';
        this.coloringPagesLoading = false;
      });
    }
  }

  async uploadColoringPage(formData) {
    try {
      const response = await axios.post(
        `${API_URL}/api/admin/game-modes/coloring`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      runInAction(() => {
        this.coloringPages.unshift(response.data.page);
      });
      return { success: true, page: response.data.page };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Ошибка загрузки'
      };
    }
  }

  async updateColoringPage(id, data) {
    try {
      const response = await axios.put(
        `${API_URL}/api/admin/game-modes/coloring/${id}`,
        data
      );
      runInAction(() => {
        const idx = this.coloringPages.findIndex(p => p.id === id);
        if (idx !== -1) {
          this.coloringPages[idx] = response.data.page;
        }
      });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Ошибка обновления'
      };
    }
  }

  async deleteColoringPage(id) {
    try {
      await axios.delete(`${API_URL}/api/admin/game-modes/coloring/${id}`);
      runInAction(() => {
        this.coloringPages = this.coloringPages.filter(p => p.id !== id);
      });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Ошибка удаления'
      };
    }
  }

  async fetchGalleryPending() {
    this.galleryPendingLoading = true;
    this.galleryPendingError = null;
    try {
      const response = await axios.get(`${API_URL}/api/admin/gallery/pending`);
      runInAction(() => {
        this.galleryPending = response.data.drawings || [];
        this.galleryPendingLoading = false;
      });
    } catch (error) {
      runInAction(() => {
        this.galleryPendingError = error.response?.data?.error || 'Ошибка загрузки';
        this.galleryPendingLoading = false;
      });
    }
  }

  async approveGalleryDrawing(id) {
    try {
      await axios.put(`${API_URL}/api/admin/gallery/${id}/approve`);
      runInAction(() => {
        this.galleryPending = this.galleryPending.filter(d => d.id !== id);
      });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Ошибка одобрения'
      };
    }
  }

  async rejectGalleryDrawing(id, reason = '') {
    try {
      await axios.put(`${API_URL}/api/admin/gallery/${id}/reject`, { reason });
      runInAction(() => {
        this.galleryPending = this.galleryPending.filter(d => d.id !== id);
      });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Ошибка отклонения'
      };
    }
  }

  async renameGalleryDrawing(id, title) {
    try {
      await axios.put(`${API_URL}/api/admin/gallery/${id}/rename`, { title });
      runInAction(() => {
        const idx = this.galleryPending.findIndex(d => d.id === id);
        if (idx !== -1) {
          this.galleryPending[idx] = { ...this.galleryPending[idx], title };
        }
      });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Ошибка переименования'
      };
    }
  }

  async deleteGalleryDrawing(id) {
    try {
      await axios.delete(`${API_URL}/api/admin/gallery/${id}`);
      runInAction(() => {
        this.galleryPending = this.galleryPending.filter(d => d.id !== id);
      });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Ошибка удаления'
      };
    }
  }
}

export default new AdminState();
