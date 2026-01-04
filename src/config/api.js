const API_BASE_URL = import.meta.env.VITE_READ_API_BASE 
  || (process.env.NODE_ENV === 'production' 
    ? 'https://read-api.reddzit.com'
    : 'http://localhost:3000');

export default API_BASE_URL;