import { makeAutoObservable, runInAction } from 'mobx';
import api from '../services/api';

class UserState {
 user = null;
 isAuthenticated = false;
 loading = false;
 error = null;
 activityRooms = [];
 userRooms = [];
 incomingPersonalMessages = [];
 galleryDrawings = [];
 friends = [];
 friendsPreview = [];
 incomingFriendRequestsCount = 0;
 notifications = [];
 unreadNotificationsCount = 0;
 toastMessage = null;
 _toastTimer = null;

 constructor() {
 makeAutoObservable(this);
 this.loadFromStorage();
 }

 saveUserToStorage(user) {
 if (!user) return;

 const storageUser = { ...user };

 if (typeof storageUser.avatar_url === 'string' && storageUser.avatar_url.startsWith('data:')) {
 delete storageUser.avatar_url;
 }

 try {
 localStorage.setItem('user', JSON.stringify(storageUser));
 } catch (error) {
 try {
 const minimalUser = {
 id: storageUser.id,
 username: storageUser.username,
 email: storageUser.email,
 created_at: storageUser.created_at,
 settings: storageUser.settings
 };
 localStorage.setItem('user', JSON.stringify(minimalUser));
 } catch (_) {
 }
 }
 }

  loadFromStorage() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (token && user) {
      try {
        this.user = JSON.parse(user);
        this.isAuthenticated = true;
      } catch (error) {
        localStorage.removeItem('user');
      }
    }
  }

  async register(username, email, password) {
    this.loading = true;
    this.error = null;
    try {
      const response = await api.post('/api/auth/register', {
        username,
        email,
        password
      });
      const { user, token } = response.data;
      runInAction(() => {
        this.user = user;
        this.isAuthenticated = true;
        this.loading = false;
      });
 localStorage.setItem('token', token);
 this.saveUserToStorage(user);
    } catch (error) {
      runInAction(() => {
        this.error = error.response?.data?.error || 'Registration failed';
        this.loading = false;
      });
    }
  }

  async login(email, password) {
    this.loading = true;
    this.error = null;
    try {
      const response = await api.post('/api/auth/login', {
        email,
        password
      });
      const { user, token } = response.data;
      runInAction(() => {
        this.user = user;
        this.isAuthenticated = true;
        this.loading = false;
      });
 localStorage.setItem('token', token);
 this.saveUserToStorage(user);
    } catch (error) {
      runInAction(() => {
        this.error = error.response?.data?.error || 'Login failed';
        this.loading = false;
      });
    }
  }

  async logout() {
    try {
      await api.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout error', error);
    } finally {
      runInAction(() => {
        this.user = null;
        this.isAuthenticated = false;
      });
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }

  async updateProfile(updates) {
    this.loading = true;
    try {
      const response = await api.put('/api/users/me', updates);
 runInAction(() => {
 this.user = response.data.user;
 this.saveUserToStorage(this.user);
 this.loading = false;
 });
    } catch (error) {
      runInAction(() => {
        this.error = error.response?.data?.error || 'Update failed';
        this.loading = false;
      });
    }
  }

  async changePassword(currentPassword, newPassword) {
    this.loading = true;
    this.error = null;
    try {
      await api.put('/api/users/me/password', {
        currentPassword,
        newPassword
      });
      runInAction(() => {
        this.loading = false;
      });
    } catch (error) {
      runInAction(() => {
        this.error = error.response?.data?.error || 'Ошибка смены пароля';
        this.loading = false;
      });
      throw error;
    }
  }

  async uploadAvatar(file) {
    const formData = new FormData();
    formData.append('avatar', file);
    this.loading = true;
    this.error = null;
    try {
      const response = await api.post('/api/users/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
 runInAction(() => {
 this.user.avatar_url = response.data.avatarUrl;
 this.saveUserToStorage(this.user);
 this.loading = false;
 });
    } catch (error) {
      console.error('Upload avatar error:', error.response || error);
      runInAction(() => {
        this.error = error.response?.data?.error || 'Upload failed';
        this.loading = false;
      });
      throw error;
    }
  }

  async updateSettings(settings) {
    try {
      const response = await api.put('/api/users/me/settings', { settings });
 runInAction(() => {
 this.user.settings = response.data.settings;
 this.saveUserToStorage(this.user);
 });
    } catch (error) {
      console.error('Update settings error', error);
    }
  }

  async fetchCurrentUser() {
    try {
      const response = await api.get('/api/users/me');
      runInAction(() => {
        if (response.data.user) {
          this.user = { ...this.user, ...response.data.user };
        }
      });
    } catch (error) {
      console.error('Fetch current user error:', error);
    }
  }

  async fetchUserRooms() {
    try {
      const response = await api.get('/api/users/me/rooms');
      runInAction(() => {
        this.userRooms = response.data.rooms;
      });
    } catch (error) {
      console.error('Fetch rooms error', error);
    }
  }

  async fetchActivityRooms() {
    try {
      const response = await api.get('/api/users/me/activity-rooms');
      runInAction(() => {
        this.activityRooms = response.data.rooms || [];
      });
    } catch (error) {
      console.error('Fetch activity rooms error', error);
    }
  }

  addIncomingPersonalMessage(msg) {
    this.incomingPersonalMessages = [...this.incomingPersonalMessages, msg];
  }

  consumeIncomingPersonalMessages() {
    const msgs = [...this.incomingPersonalMessages];
    this.incomingPersonalMessages = [];
    return msgs;
  }

  async fetchGalleryDrawings() {
    try {
      const response = await api.get('/api/gallery/user/me');
      runInAction(() => {
        this.galleryDrawings = response.data.drawings || [];
      });
    } catch (error) {
      console.error('Fetch gallery drawings error:', error);
    }
  }

  async fetchUserGalleryDrawings(userId) {
    try {
      const response = await api.get(`/api/gallery/user/${userId}`);
      return response.data.drawings || [];
    } catch (error) {
      console.error('Fetch user gallery drawings error:', error);
      return [];
    }
  }

  async removeGalleryDrawing(drawingId) {
    await api.delete(`/api/gallery/${drawingId}`);
    runInAction(() => {
      this.galleryDrawings = this.galleryDrawings.filter(d => d.id !== drawingId);
    });
  }

  async likeGalleryDrawing(drawingId) {
    const response = await api.post(`/api/gallery/${drawingId}/like`);
    return response.data;
  }

  async fetchPublicUser(userId) {
    const response = await api.get(`/api/users/${userId}`);
    return response.data;
  }

  async fetchFriends(searchQuery) {
    try {
      const params = searchQuery ? { q: searchQuery } : {};
      const response = await api.get('/api/users/me/friends', { params });
      runInAction(() => {
        this.friends = response.data.friends || [];
        this.friendsPreview = (response.data.friends || []).slice(0, 5);
      });
      return response.data.friends || [];
    } catch (error) {
      console.error('Fetch friends error:', error);
      return [];
    }
  }

  async fetchIncomingFriendRequests() {
    try {
      const response = await api.get('/api/users/me/friend-requests/incoming');
      return response.data.requests || [];
    } catch (error) {
      console.error('Fetch incoming friend requests error:', error);
      return [];
    }
  }

  async fetchOutgoingFriendRequests() {
    try {
      const response = await api.get('/api/users/me/friend-requests/outgoing');
      return response.data.requests || [];
    } catch (error) {
      console.error('Fetch outgoing friend requests error:', error);
      return [];
    }
  }

  async fetchIncomingFriendRequestsCount() {
    try {
      const response = await api.get('/api/users/me/friend-requests/count');
      runInAction(() => {
        this.incomingFriendRequestsCount = response.data.count || 0;
      });
    } catch (error) {
      console.error('Fetch friend requests count error:', error);
    }
  }

  async sendFriendRequest(userId) {
    const response = await api.post(`/api/users/${userId}/friend-request`);
    await this.fetchIncomingFriendRequestsCount();
    this.showToast('Заявка отправлена');
    return response.data;
  }

  async cancelFriendRequest(userId) {
    const response = await api.delete(`/api/users/${userId}/friend-request`);
    this.showToast('Заявка отменена');
    return response.data;
  }

  async acceptFriendRequest(userId) {
    const response = await api.post(`/api/users/${userId}/friend-request/accept`);
    await this.fetchIncomingFriendRequestsCount();
    await this.fetchFriends();
    this.showToast('Заявка принята');
    return response.data;
  }

  async declineFriendRequest(userId) {
    const response = await api.post(`/api/users/${userId}/friend-request/decline`);
    await this.fetchIncomingFriendRequestsCount();
    this.showToast('Заявка отклонена');
    return response.data;
  }

  async removeFriend(userId) {
    const response = await api.delete(`/api/users/${userId}/friends`);
    await this.fetchFriends();
    this.showToast('Удалено из друзей');
    return response.data;
  }

  async fetchNotifications() {
    try {
      const response = await api.get('/api/users/me/notifications');
      runInAction(() => {
        this.notifications = response.data.notifications || [];
        this.unreadNotificationsCount = response.data.unreadCount || 0;
      });
    } catch (error) {
      console.error('Fetch notifications error:', error);
    }
  }

  addNotification(notification) {
    runInAction(() => {
      this.notifications = [notification, ...this.notifications.filter(n => n.id !== notification.id)].slice(0, 50);
      if (!notification.isRead) {
        this.unreadNotificationsCount += 1;
      }
      if (notification.type === 'friend_request') {
        this.incomingFriendRequestsCount += 1;
      }
    });
  }

  async markNotificationRead(notificationId) {
    const response = await api.post(`/api/users/me/notifications/${notificationId}/read`);
    runInAction(() => {
      this.notifications = this.notifications.map(n =>
        n.id === notificationId ? { ...n, isRead: true } : n
      );
      this.unreadNotificationsCount = response.data.unreadCount ?? Math.max(0, this.unreadNotificationsCount - 1);
    });
  }

  async markAllNotificationsRead() {
    await api.post('/api/users/me/notifications/read-all');
    runInAction(() => {
      this.notifications = this.notifications.map(n => ({ ...n, isRead: true }));
      this.unreadNotificationsCount = 0;
    });
  }

  showToast(message, duration = 3000) {
    if (this._toastTimer) {
      clearTimeout(this._toastTimer);
    }
    runInAction(() => {
      this.toastMessage = message;
    });
    this._toastTimer = setTimeout(() => {
      runInAction(() => {
        this.toastMessage = null;
      });
    }, duration);
  }

  get unreadMessagesCount() {
    return this.incomingPersonalMessages.length;
  }

  async deleteRoom(roomId) {
    await api.delete(`/api/rooms/${roomId}`);
  }

  async updateRoomVisibility(roomId, { isPublic, password }) {
    await api.patch(`/api/rooms/${roomId}`, { isPublic, password });
  }

  async createRoom(name, isPublic, password = null) {
    this.loading = true;
    this.error = null;
    try {
      const response = await api.post('/api/rooms', {
        name,
        isPublic,
        password: isPublic ? null : password
      });

      runInAction(() => {
        this.loading = false;
      });

      await this.fetchUserRooms();
      return response.data.roomId;
    } catch (error) {
      runInAction(() => {
        this.error = error.response?.data?.error || 'Ошибка создания комнаты';
        this.loading = false;
      });
      throw error;
    }
  }
}

export default new UserState();
