const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://read-api.seojeek.com'
  : 'http://localhost:3000';

export default API_BASE_URL;