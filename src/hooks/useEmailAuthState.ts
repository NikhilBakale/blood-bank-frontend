import { useEffect, useState } from "react";

const AUTH_TOKEN_KEY = "blood_bank_auth_token";

export function useEmailAuthState() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    return !!token;
  });

  useEffect(() => {
    // Check immediately
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    setIsAuthenticated(!!token);

    // Listen for storage changes
    const handleStorageChange = () => {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      setIsAuthenticated(!!token);
    };

    window.addEventListener("storage", handleStorageChange);
    
    // Also listen for changes within the same tab
    const interval = setInterval(() => {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      setIsAuthenticated(!!token);
    }, 100);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  return isAuthenticated;
}
