/**
 * API client for backend communication
 */

import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor (for auth tokens if needed)
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    // const token = getToken();
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor (for error handling)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

/**
 * Event API
 */
export const eventAPI = {
  // Get events with filters
  getEvents: async (params: {
    view?: 'toddler' | 'child' | 'family';
    dateFrom?: string;
    dateTo?: string;
    category?: string;
    priceMax?: number;
    distanceMax?: number;
    indoorOnly?: boolean;
    limit?: number;
  }) => {
    const response = await api.get('/events', { params });
    return response.data;
  },

  // Get single event
  getEvent: async (id: string) => {
    const response = await api.get(`/events/${id}`);
    return response.data;
  },

  // Get calendar events (grouped by date)
  getCalendarEvents: async (
    view: 'toddler' | 'child' | 'family',
    dateFrom?: string,
    dateTo?: string
  ) => {
    const response = await api.get(`/events/calendar/${view}`, {
      params: { dateFrom, dateTo },
    });
    return response.data;
  },

  // Get events for map view
  getMapEvents: async (view: 'toddler' | 'child' | 'family', dateFrom?: string, dateTo?: string) => {
    const response = await api.get('/events/map/view', {
      params: { view, dateFrom, dateTo },
    });
    return response.data;
  },

  // Search events
  searchEvents: async (query: string, view: 'toddler' | 'child' | 'family' = 'family', limit = 50) => {
    const response = await api.get('/events/search/query', {
      params: { q: query, view, limit },
    });
    return response.data;
  },
};

/**
 * Favorites API
 */
export const favoritesAPI = {
  // Get user favorites
  getFavorites: async (userId: string) => {
    const response = await api.get(`/favorites/${userId}`);
    return response.data;
  },

  // Add favorite
  addFavorite: async (eventId: string, userId: string) => {
    const response = await api.post('/favorites', { eventId, userId });
    return response.data;
  },

  // Remove favorite
  removeFavorite: async (favoriteId: string) => {
    const response = await api.delete(`/favorites/${favoriteId}`);
    return response.data;
  },
};

/**
 * Attendance API
 */
export const attendanceAPI = {
  // Get user attendance records
  getAttendance: async (userId: string) => {
    const response = await api.get(`/attendance/${userId}`);
    return response.data;
  },

  // Mark event as attended
  addAttendance: async (data: {
    eventId: string;
    userId: string;
    attendedDate: string;
    rating?: number;
    notes?: string;
    photos?: string[];
    actualCost?: number;
  }) => {
    const response = await api.post('/attendance', data);
    return response.data;
  },
};

/**
 * Stats API
 */
export const statsAPI = {
  // Get database statistics
  getStats: async () => {
    const response = await api.get('/stats');
    return response.data;
  },

  // Get scrape logs
  getScrapeLogs: async (limit = 20) => {
    const response = await api.get('/scrape-logs', { params: { limit } });
    return response.data;
  },

  // Trigger manual scrape
  triggerScrape: async () => {
    const response = await api.post('/scrape/trigger');
    return response.data;
  },
};
