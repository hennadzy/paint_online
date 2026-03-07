// client/src/store/userState.js
import { makeAutoObservable, runInAction } from 'mobx';
import axios from 'axios';
import { API_URL } from './canvasState';

class UserState {
  user = null;
  isAuthenticated = false;
  loading = false;
  error = null;
  favorites = [];
  userRooms = [];

  constructor() {
    makeAutoObservable(this);
    this.loadFromStorage();
  }

  loadFromStorage() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (token && user) {
      this.user = JSON.parse(user);
      this.isAuthenticated = true;
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }

  async register(username, email, password) {
    this.loading = true;
    this.error = null;
    try {
      const response = await axios.post(`${API_URL}/api/auth/register`, {
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
      localStorage.setItem('user', JSON.stringify(user));
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
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
      const response = await axios.post(`${API_URL}/api/auth/login`, {
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
      localStorage.setItem('user', JSON.stringify(user));
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } catch (error) {
      runInAction(() => {
        this.error = error.response?.data?.error || 'Login failed';
        this.loading = false;
      });
    }
  }

  async logout() {
    try {
      await axios.post(`${API_URL}/api/auth/logout`);
    } catch (error) {
      console.error('Logout error', error);
    } finally {
      runInAction(() => {
        this.user = null;
        this.isAuthenticated = false;
      });
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      delete axios.defaults.headers.common['Authorization'];
    }
  }

  async updateProfile(updates) {
    this.loading = true;
    try {
      const response = await axios.put(`${API_URL}/api/users/me`, updates);
      runInAction(() => {
        this.user = response.data.user;
        localStorage.setItem('user', JSON.stringify(this.user));
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
      await axios.put(`${API_URL}/api/users/me/password`, {
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
      const response = await axios.post(`${API_URL}/api/users/me/avatar`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      runInAction(() => {
        this.user.avatar_url = response.data.avatarUrl;
        localStorage.setItem('user', JSON.stringify(this.user));
        this.loading = false;
      });
    } catch (error) {
      console.error('Upload avatar error:', error.response || error); // лог ошибки
      runInAction(() => {
        this.error = error.response?.data?.error || 'Upload failed';
        this.loading = false;
      });
      throw error; // Re-throw so component can catch
    }
  }

  async updateSettings(settings) {
    try {
      const response = await axios.put(`${API_URL}/api/users/me/settings`, { settings });
      runInAction(() => {
        this.user.settings = response.data.settings;
        localStorage.setItem('user', JSON.stringify(this.user));
      });
    } catch (error) {
      console.error('Update settings error', error);
    }
  }

  async fetchUserRooms() {
    try {
      const response = await axios.get(`${API_URL}/api/users/me/rooms`);
      runInAction(() => {
        this.userRooms = response.data.rooms;
      });
    } catch (error) {
      console.error('Fetch rooms error', error);
    }
  }

  async fetchFavorites() {
    try {
      const response = await axios.get(`${API_URL}/api/users/me/favorites`);
      runInAction(() => {
        this.favorites = response.data.favorites;
      });
    } catch (error) {
      console.error('Fetch favorites error', error);
    }
  }

  async addFavorite(roomId) {
    try {
      await axios.post(`${API_URL}/api/users/me/favorites/${roomId}`);
      await this.fetchFavorites();
    } catch (error) {
      console.error('Add favorite error', error);
    }
  }

  async removeFavorite(roomId) {
    try {
      await axios.delete(`${API_URL}/api/users/me/favorites/${roomId}`);
      await this.fetchFavorites();
    } catch (error) {
      console.error('Remove favorite error', error);
    }
  }
}

export default new UserState();
