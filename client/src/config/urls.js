const PRODUCTION_API_URL = 'https://paint-online-back.onrender.com';
const PRODUCTION_WS_URL = 'wss://paint-online-back.onrender.com';

const isLocalhost = () => window.location.hostname === 'localhost';

export const API_URL = isLocalhost() ? 'http://localhost:5000' : PRODUCTION_API_URL;
export const WS_URL = isLocalhost() ? 'ws://localhost:5000' : PRODUCTION_WS_URL;
