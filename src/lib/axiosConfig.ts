import axios from 'axios';
import { toast } from '@/components/ui/sonner';

const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const API_BASE_URL = rawApiBaseUrl.replace(/\/+$/, '');

axios.defaults.baseURL = API_BASE_URL;
axios.defaults.headers.common['Content-Type'] = 'application/json';

axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    const publicAuthRequest = config.url?.startsWith('/auth');

    if (token && !publicAuthRequest && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      toast.error(
        error?.response?.data?.message ||
          'Session expired. Please login again.',
        {
          description:
            error?.response?.data?.error ||
            'Your session has ended and you need to sign in again.',
        }
      );
      setTimeout(() => {
        window.location.href = '/';
      }, 250);
    }
    return Promise.reject(error);
  }
);

export default axios;

