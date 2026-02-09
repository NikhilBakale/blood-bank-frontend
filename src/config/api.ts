// API Configuration
// Uses environment variable or falls back to localhost for development
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
export const API_BASE_URL = `${API_URL}/api`;

// Export for convenience
export default API_BASE_URL;
