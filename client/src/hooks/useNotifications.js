import { useEffect } from 'react';
import userState from '../store/userState';
import PersonalWSService from '../services/PersonalWSService';

export const useNotifications = () => {
  useEffect(() => {
    if (!userState.isAuthenticated) return undefined;

    userState.fetchNotifications();
    userState.fetchIncomingFriendRequestsCount();

    const handleNotification = (notification) => {
      userState.addNotification(notification);
    };

    PersonalWSService.on('notification', handleNotification);

    return () => {
      PersonalWSService.off('notification', handleNotification);
    };
  }, [userState.isAuthenticated]);
};
