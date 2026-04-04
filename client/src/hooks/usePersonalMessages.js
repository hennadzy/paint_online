import { useEffect } from 'react';
import userState from '../store/userState';
import WebSocketService from '../services/WebSocketService';
import PersonalWSService from '../services/PersonalWSService';

export const usePersonalMessages = () => {
  useEffect(() => {
    if (userState.isAuthenticated) {
      const token = localStorage.getItem('token');
      if (token) {
        PersonalWSService.connect(token);
      }
    } else {
      PersonalWSService.disconnect();
    }
  }, [userState.isAuthenticated]);

  useEffect(() => {
    const handlePersonalMessage = (data) => {
      userState.addIncomingPersonalMessage(data);
    };

    PersonalWSService.on('personalMessage', handlePersonalMessage);
    WebSocketService.on('personalMessage', handlePersonalMessage);

    return () => {
      PersonalWSService.off('personalMessage', handlePersonalMessage);
      WebSocketService.off('personalMessage', handlePersonalMessage);
    };
  }, []);
};
