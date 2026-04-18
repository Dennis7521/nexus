/**
 * Notification Helper Functions
 * 
 * These functions help manage notification counts for Messages and Requests.
 */

interface NotificationCounts {
  unreadMessages: number;
  unreadRequests: number;
}

/**
 * Fetch unread notification counts from the backend
 */
export const fetchNotificationCounts = async (): Promise<NotificationCounts> => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return { unreadMessages: 0, unreadRequests: 0 };
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/notifications/counts`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch notification counts');
    }

    const data = await response.json();
    return {
      unreadMessages: data.unreadMessages || 0,
      unreadRequests: data.unreadRequests || 0
    };
  } catch (error) {
    console.error('Error fetching notification counts:', error);
    return {
      unreadMessages: 0,
      unreadRequests: 0
    };
  }
};

/**
 * Mark all messages as read for the current user
 */
export const markMessagesAsRead = async (): Promise<void> => {
  try {
    await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/notifications/messages/mark-read`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
  }
};

/**
 * Mark messages in a specific conversation as read
 */
export const markConversationAsRead = async (exchangeId: string): Promise<void> => {
  try {
    await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/notifications/messages/mark-read/${exchangeId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
  } catch (error) {
    console.error('Error marking conversation as read:', error);
  }
};

/**
 * Mark direct messages with a specific partner as read
 */
export const markDirectMessagesAsRead = async (partnerId: string): Promise<void> => {
  try {
    await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/notifications/messages/mark-read/direct/${partnerId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
  } catch (error) {
    console.error('Error marking direct messages as read:', error);
  }
};

/**
 * Mark all pending requests as viewed
 */
export const markRequestsAsViewed = async (): Promise<void> => {
  try {
    await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/notifications/requests/mark-viewed`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
  } catch (error) {
    console.error('Error marking requests as viewed:', error);
  }
};
