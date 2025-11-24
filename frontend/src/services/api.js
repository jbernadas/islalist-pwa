import axios from 'axios';

// API base URL - will use proxy in development, direct URL in production
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/api/auth/refresh/`, {
            refresh: refreshToken,
          });

          const { access, refresh } = response.data;
          localStorage.setItem('accessToken', access);
          localStorage.setItem('refreshToken', refresh);

          // Retry the original request with new token
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return axios(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (userData) => api.post('/api/auth/register/', userData),
  login: (credentials) => api.post('/api/auth/login/', credentials),
  logout: (refreshToken) => api.post('/api/auth/logout/', { refresh: refreshToken }),
  getProfile: () => api.get('/api/auth/profile/'),
  updateProfile: (userData) => api.patch('/api/auth/profile/', userData),
  refreshToken: (refreshToken) => api.post('/api/auth/refresh/', { refresh: refreshToken }),
  verifyToken: (token) => api.post('/api/auth/verify/', { token }),

  // Email verification
  verifyEmail: (key) => api.post('/api/auth/registration/verify-email/', { key }),
  resendVerificationEmail: (email) => api.post('/api/auth/registration/resend-email/', { email }),

  // Password reset
  requestPasswordReset: (email) => api.post('/api/auth/password/reset/', { email }),
  confirmPasswordReset: (uid, token, new_password1, new_password2) =>
    api.post('/api/auth/password/reset/confirm/', {
      uid,
      token,
      new_password1,
      new_password2
    }),
};

// Public user profiles API
export const usersAPI = {
  getPublicProfile: (username) => api.get(`/api/users/${username}/`),
  getUserListings: (username) => api.get(`/api/users/${username}/listings/`),
  getUserAnnouncements: (username) => api.get(`/api/users/${username}/announcements/`),
};

// Provinces API
export const provincesAPI = {
  getAll: () => api.get('/api/provinces/'),
  getBySlug: (slug) => api.get(`/api/provinces/${slug}/`),
  getMunicipalities: (slug) => api.get(`/api/provinces/${slug}/municipalities/`),
};

// Municipalities API
export const municipalitiesAPI = {
  getAll: (params) => api.get('/api/municipalities/', { params }),
  getBySlug: (slug) => api.get(`/api/municipalities/${slug}/`),
  getDistrictsOrBarangays: (slug) => api.get(`/api/municipalities/${slug}/districts-or-barangays/`),
};

// Barangays API
export const barangaysAPI = {
  getAll: (params) => api.get('/api/barangays/', { params }),
  getBySlug: (slug) => api.get(`/api/barangays/${slug}/`),
};

// Categories API
export const categoriesAPI = {
  getAll: () => api.get('/api/categories/'),
  getBySlug: (slug) => api.get(`/api/categories/${slug}/`),
};

// Listings API
export const listingsAPI = {
  getAll: (params) => api.get('/api/listings/', { params }),
  getById: (id) => api.get(`/api/listings/${id}/`),
  create: (formData) => {
    return api.post('/api/listings/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  update: (id, formData) => {
    return api.put(`/api/listings/${id}/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  delete: (id) => api.delete(`/api/listings/${id}/`),
  getMyListings: () => api.get('/api/listings/my_listings/'),
  getFavorites: () => api.get('/api/listings/favorites/'),
  toggleFavorite: (id) => api.post(`/api/listings/${id}/toggle_favorite/`),
  markSold: (id) => api.post(`/api/listings/${id}/mark_sold/`),
  deleteImage: (id, imageId) => api.delete(`/api/listings/${id}/delete_image/`, {
    data: { image_id: imageId }
  }),
  getMyImages: () => api.get('/api/listings/my_images/'),
};

// Announcements API
export const announcementsAPI = {
  getAll: (params) => api.get('/api/announcements/', { params }),
  getById: (id) => api.get(`/api/announcements/${id}/`),
  create: (data) => api.post('/api/announcements/', data),
  update: (id, data) => api.put(`/api/announcements/${id}/`, data),
  delete: (id) => api.delete(`/api/announcements/${id}/`),
  getMyAnnouncements: () => api.get('/api/announcements/my_announcements/'),
};

export default api;
