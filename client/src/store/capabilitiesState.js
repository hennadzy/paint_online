import { makeAutoObservable, runInAction } from 'mobx';
import axios from 'axios';
import { API_URL } from './canvasState';
import userState from './userState';

/** Уровень возможностей: не путать с полем role в БД (там user/admin/…). */
function resolveCapabilityTier(user, isAuthenticated) {
  if (!isAuthenticated || !user) return 'guest';
  const r = user.role;
  if (r === 'superadmin' || r === 'admin') return 'admin';
  if (r === 'premium') return 'premium';
  return 'user';
}

const SAFE_FALLBACK = {
  features: {
    penPressure: { enabled: false },
    brushPro: { enabled: false },
  },
  roles: {
    guest: { penPressure: false, brushPro: false },
    user: { penPressure: false, brushPro: false },
    premium: { penPressure: false, brushPro: false },
    admin: { penPressure: false, brushPro: false },
  },
};

class CapabilitiesState {
  data = null;
  loaded = false;
  loadError = null;

  constructor() {
    makeAutoObservable(this);
  }

  get tier() {
    return resolveCapabilityTier(userState.user, userState.isAuthenticated);
  }

  async fetch() {
    try {
      const res = await axios.get(`${API_URL}/api/capabilities`);
      runInAction(() => {
        this.data = res.data;
        this.loaded = true;
        this.loadError = null;
      });
    } catch (e) {
      runInAction(() => {
        this.data = SAFE_FALLBACK;
        this.loaded = true;
        this.loadError = e;
      });
    }
  }

  isFeatureAllowed(featureId) {
    if (!this.data) return false;
    const masterOn = this.data.features?.[featureId]?.enabled !== false;
    if (!masterOn) return false;
    const t = this.tier;
    return Boolean(this.data.roles?.[t]?.[featureId]);
  }

  get penPressureAllowed() {
    return this.isFeatureAllowed('penPressure');
  }

  get brushProAllowed() {
    return this.isFeatureAllowed('brushPro');
  }
}

export default new CapabilitiesState();
