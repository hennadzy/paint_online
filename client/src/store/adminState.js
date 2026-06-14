import { makeAutoObservable, runInAction } from 'mobx';
import axios from 'axios';
import { API_URL } from './canvasState';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

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

  coloringSections = [];
  coloringSectionsLoading = false;
  coloringSectionsError = null;

  galleryPending = [];
  galleryPendingLoading = false;
  galleryPendingError = null;

  galleryApproved = [];
  galleryApprovedLoading = false;
  galleryApprovedError = null;

  broadcastMailConfigured = null;

  roleCapabilitiesPayload = null;
  roleCapabilitiesLoading = false;
  roleCapabilitiesError = null;

  constructor() {
    makeAutoObservable(this);
  }

  setActiveTab(tab) {
    this.activeTab = tab;
    if (tab === 'users') {
      this.fetchUsers();
    } else if (tab === 'rooms') {
      this.fetchRooms();
    } else if (tab === 'gallery') {
      this.fetchGalleryAll();
    } else if (tab === 'broadcast') {
      this.fetchBroadcastMailStatus();
    } else if (tab === 'capabilities') {
      this.fetchRoleCapabilities();
    } else if (tab === 'gameModes') {
      this.fetchColoringPages();
      this.fetchColoringSections();
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
      const response = await axios.get(`${API_URL}/api/admin/stats`, { headers: getAuthHeaders() });
      runInAction(() => {
        this.stats = response.data;
      });
    } catch (error) {
      const status = error?.response?.status;
      if (status === 401 || status === 403) {
        runInAction(() => {
          this.stats = null;
        });
        return;
      }
      console.error('Fetch admin stats error:', error);
    }
  }

  async fetchUsers(page = 1) {
    this.usersLoading = true;
    this.usersError = null;
    try {
      const response = await axios.get(`${API_URL}/api/admin/users`, {
        headers: getAuthHeaders(),
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
      const response = await axios.get(`${API_URL}/api/admin/users/${userId}`, { headers: getAuthHeaders() });
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
      const response = await axios.put(`${API_URL}/api/admin/users/${userId}`, data, { headers: getAuthHeaders() });
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
      await axios.delete(`${API_URL}/api/admin/users/${userId}`, { headers: getAuthHeaders() });
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
      const response = await axios.post(`${API_URL}/api/admin/users/${userId}/toggle-active`, null, { headers: getAuthHeaders() });
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
      await axios.post(`${API_URL}/api/admin/users/${userId}/change-password`, { newPassword }, { headers: getAuthHeaders() });
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
        headers: getAuthHeaders(),
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
      const response = await axios.get(`${API_URL}/api/admin/rooms/${roomId}`, { headers: getAuthHeaders() });
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
      await axios.put(`${API_URL}/api/admin/rooms/${roomId}`, data, { headers: getAuthHeaders() });
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
      await axios.delete(`${API_URL}/api/admin/rooms/${roomId}`, { headers: getAuthHeaders() });
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
      const response = await axios.post(`${API_URL}/api/admin/rooms/${roomId}/join`, { username: 'Admin' }, { headers: getAuthHeaders() });
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
        headers: getAuthHeaders(),
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
        headers: getAuthHeaders(),
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
      const response = await axios.get(`${API_URL}/api/admin/game-modes/coloring`, { headers: getAuthHeaders() });
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

  async fetchColoringSections() {
    this.coloringSectionsLoading = true;
    this.coloringSectionsError = null;
    try {
      const response = await axios.get(`${API_URL}/api/admin/coloring-sections`, { headers: getAuthHeaders() });
      runInAction(() => {
        this.coloringSections = response.data.sections || [];
        this.coloringSectionsLoading = false;
      });
    } catch (error) {
      runInAction(() => {
        this.coloringSectionsError = error.response?.data?.error || 'Ошибка загрузки разделов';
        this.coloringSectionsLoading = false;
      });
    }
  }

  async createColoringSection(payload) {
    try {
      console.log('Creating section:', payload);
      
      const isFormData = payload instanceof FormData;
      const response = await axios.post(
        `${API_URL}/api/admin/coloring-sections`,
        payload,
        {
          headers: {
            ...getAuthHeaders(),
            ...(isFormData ? { 'Content-Type': 'multipart/form-data' } : {})
          }
        }
      );
      console.log('Section created:', response.data);
      await this.fetchColoringSections();
      return { success: true, section: response.data.section };
    } catch (error) {
      console.error('Create section error:', error.response?.data);
      return {
        success: false,
        error: error.response?.data?.error || 'Ошибка создания раздела'
      };
    }
  }

  async deleteColoringSection(sectionId) {
    try {
      await axios.delete(`${API_URL}/api/admin/coloring-sections/${sectionId}`, { headers: getAuthHeaders() });
      await this.fetchColoringSections();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Ошибка удаления раздела'
      };
    }
  }

  async uploadColoringPage(formData, sectionId = null) {
    try {
      if (sectionId !== undefined && sectionId !== null) {
        const sid = parseInt(sectionId, 10);
        if (Number.isFinite(sid) && sid > 0) formData.append('section_id', sid);
      }

      const response = await axios.post(
        `${API_URL}/api/admin/game-modes/coloring`,
        formData,
        { headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' } }
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
        data,
        { headers: getAuthHeaders() }
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
      await axios.delete(`${API_URL}/api/admin/game-modes/coloring/${id}`, { headers: getAuthHeaders() });
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
      const response = await axios.get(`${API_URL}/api/admin/gallery/pending`, { headers: getAuthHeaders() });
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

  async fetchGalleryApproved() {
    this.galleryApprovedLoading = true;
    this.galleryApprovedError = null;
    try {
      const response = await axios.get(`${API_URL}/api/admin/gallery/approved`, { headers: getAuthHeaders() });
      runInAction(() => {
        this.galleryApproved = response.data.drawings || [];
        this.galleryApprovedLoading = false;
      });
    } catch (error) {
      runInAction(() => {
        this.galleryApprovedError = error.response?.data?.error || 'Ошибка загрузки';
        this.galleryApprovedLoading = false;
      });
    }
  }

  async fetchGalleryAll() {
    await Promise.all([this.fetchGalleryPending(), this.fetchGalleryApproved()]);
  }

  async approveGalleryDrawing(id) {
    try {
      await axios.put(`${API_URL}/api/admin/gallery/${id}/approve`, null, { headers: getAuthHeaders() });
      runInAction(() => {
        this.galleryPending = this.galleryPending.filter(d => d.id !== id);
      });
      await this.fetchGalleryApproved();
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
      await axios.put(`${API_URL}/api/admin/gallery/${id}/reject`, { reason }, { headers: getAuthHeaders() });
      runInAction(() => {
        this.galleryPending = this.galleryPending.filter(d => d.id !== id);
        this.galleryApproved = this.galleryApproved.filter(d => d.id !== id);
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
      const response = await axios.put(`${API_URL}/api/admin/gallery/${id}/rename`, { title }, { headers: getAuthHeaders() });
      const newTitle = response.data.drawing?.title ?? title;
      runInAction(() => {
        const apply = (arr) => arr.map(d => (d.id === id ? { ...d, title: newTitle } : d));
        this.galleryPending = apply(this.galleryPending);
        this.galleryApproved = apply(this.galleryApproved);
      });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Ошибка переименования'
      };
    }
  }

  async updateGalleryAlt(id, alt) {
    try {
      const response = await axios.put(`${API_URL}/api/admin/gallery/${id}/alt`, { alt }, { headers: getAuthHeaders() });
      const newAlt = response.data.drawing?.alt ?? alt;

      runInAction(() => {
        const apply = (arr) => arr.map(d => (d.id === id ? { ...d, alt: newAlt } : d));
        this.galleryPending = apply(this.galleryPending);
        this.galleryApproved = apply(this.galleryApproved);
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Ошибка обновления alt'
      };
    }
  }

  async updateGalleryAuthorName(id, authorName) {
    try {
      const response = await axios.put(`${API_URL}/api/admin/gallery/${id}/author-name`, { authorName });
      const newAuthorName = response.data.drawing?.author_name ?? authorName;

      runInAction(() => {
        const apply = (arr) => arr.map(d => (d.id === id ? { ...d, author_name: newAuthorName } : d));
        this.galleryPending = apply(this.galleryPending);
        this.galleryApproved = apply(this.galleryApproved);
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Ошибка обновления имени автора'
      };
    }
  }

  async deleteGalleryDrawing(id) {
    try {
      await axios.delete(`${API_URL}/api/admin/gallery/${id}`);
      runInAction(() => {
        this.galleryPending = this.galleryPending.filter(d => d.id !== id);
        this.galleryApproved = this.galleryApproved.filter(d => d.id !== id);
      });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Ошибка удаления'
      };
    }
  }

  async fetchBroadcastMailStatus() {
    try {
      const response = await axios.get(`${API_URL}/api/admin/broadcast/mail-status`, { headers: getAuthHeaders() });
      runInAction(() => {
        this.broadcastMailConfigured = response.data.configured;
      });
    } catch (error) {
      runInAction(() => {
        this.broadcastMailConfigured = false;
      });
    }
  }

  async sendBroadcast(payload) {
    try {
      const response = await axios.post(`${API_URL}/api/admin/broadcast`, payload, { headers: getAuthHeaders() });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Ошибка рассылки'
      };
    }
  }

  async fetchRoleCapabilities() {
    this.roleCapabilitiesLoading = true;
    this.roleCapabilitiesError = null;
    try {
      const response = await axios.get(`${API_URL}/api/admin/capabilities`, { headers: getAuthHeaders() });
      runInAction(() => {
        this.roleCapabilitiesPayload = response.data;
        this.roleCapabilitiesLoading = false;
      });
    } catch (error) {
      runInAction(() => {
        this.roleCapabilitiesError = error.response?.data?.error || 'Не удалось загрузить настройки';
        this.roleCapabilitiesLoading = false;
      });
    }
  }

  async saveRoleCapabilities(config) {
    try {
      const response = await axios.put(`${API_URL}/api/admin/capabilities`, { config }, { headers: getAuthHeaders() });
      runInAction(() => {
        this.roleCapabilitiesPayload = response.data;
      });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Не удалось сохранить'
      };
    }
  }
}

export default new AdminState();
