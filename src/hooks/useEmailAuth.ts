import { useState, useCallback } from "react";
import { API_BASE_URL } from "@/config/api";

interface User {
  hospital_id: string;
  email: string;
  hospitalName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
}

interface AuthToken {
  token: string;
  user: User;
  expiresAt: number;
}

const AUTH_TOKEN_KEY = "blood_bank_auth_token";

export function useEmailAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return false;
    
    try {
      const authData: AuthToken = JSON.parse(token);
      if (authData.expiresAt && authData.expiresAt < Date.now()) {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        return false;
      }
      return true;
    } catch {
      return false;
    }
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      console.log("📦 No auth token in localStorage");
      return null;
    }
    
    try {
      const authData: AuthToken = JSON.parse(token);
      console.log("📦 Auth data loaded from localStorage:", authData.user);
      if (authData.expiresAt && authData.expiresAt < Date.now()) {
        console.log("⏰ Auth token expired");
        localStorage.removeItem(AUTH_TOKEN_KEY);
        return null;
      }
      return authData.user;
    } catch (err) {
      console.error("❌ Error parsing auth token:", err);
      return null;
    }
  });

  const register = useCallback(
    async (userData: Omit<User, "hospital_id"> & { password: string }) => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: userData.email,
            password: userData.password,
            hospitalName: userData.hospitalName,
            phone: userData.phone,
            address: userData.address,
            city: userData.city,
            state: userData.state,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Registration failed");
        }

        const data = await response.json();
        
        console.log('📝 Registration response:', data);
        console.log('📝 data.data:', data.data);
        console.log('📝 data.data.requiresVerification:', data.data?.requiresVerification);
        
        // Check if OTP verification is required
        if (data.data && data.data.requiresVerification) {
          console.log('✅ OTP verification required - showing OTP screen');
          // Don't set auth state yet - wait for OTP verification
          return { 
            success: true, 
            requiresVerification: true,
            hospital_id: data.data.hospital_id,
            email: data.data.email,
            hospitalName: data.data.hospitalName,
          };
        }

        console.log('⚠️ No OTP verification required - proceeding with direct login');
        
        // Old flow (if verification is disabled) - for backward compatibility
        const user: User = {
          hospital_id: data.data.hospital_id,
          email: data.data.email,
          hospitalName: data.data.hospitalName,
          phone: userData.phone,
          address: userData.address,
          city: userData.city,
          state: userData.state,
        };

        const authData: AuthToken = {
          token: data.data.token,
          user: user,
          expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        };

        localStorage.setItem(AUTH_TOKEN_KEY, JSON.stringify(authData));
        setIsAuthenticated(true);
        setCurrentUser(user);

        return { success: true, user };
      } catch (error: any) {
        throw new Error(error.message || "Registration failed");
      }
    },
    []
  );

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        
        // Check if email verification is required
        if (error.requiresVerification) {
          return {
            success: false,
            requiresVerification: true,
            hospital_id: error.hospital_id,
            email: error.email,
            message: error.message || "Email not verified",
          };
        }
        
        throw new Error(error.error || error.message || "Login failed");
      }

      const data = await response.json();
      const user: User = {
        hospital_id: data.data.hospital_id,
        email: data.data.email,
        hospitalName: data.data.hospitalName,
        phone: data.data.phone,
        address: data.data.address,
        city: data.data.city,
        state: data.data.state,
      };

      const authData: AuthToken = {
        token: data.data.token,
        user: user,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      };

      localStorage.setItem(AUTH_TOKEN_KEY, JSON.stringify(authData));
      setIsAuthenticated(true);
      setCurrentUser(user);

      return { success: true, user };
    } catch (error: any) {
      throw new Error(error.message || "Login failed");
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setIsAuthenticated(false);
    setCurrentUser(null);
  }, []);

  const getToken = useCallback((): string | null => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return null;
    
    try {
      const authData: AuthToken = JSON.parse(token);
      if (authData.expiresAt && authData.expiresAt < Date.now()) {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        return null;
      }
      return authData.token;
    } catch {
      return null;
    }
  }, []);

  const refreshAuthState = useCallback(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      try {
        const authData: AuthToken = JSON.parse(token);
        if (authData.expiresAt && authData.expiresAt < Date.now()) {
          localStorage.removeItem(AUTH_TOKEN_KEY);
          setIsAuthenticated(false);
          setCurrentUser(null);
        } else {
          setIsAuthenticated(true);
          setCurrentUser(authData.user);
        }
      } catch {
        setIsAuthenticated(false);
        setCurrentUser(null);
      }
    } else {
      setIsAuthenticated(false);
      setCurrentUser(null);
    }
  }, []);

  const saveAuthAfterVerification = useCallback((token: string, userData: any) => {
    const user: User = {
      hospital_id: userData.hospital_id,
      email: userData.email,
      hospitalName: userData.hospitalName,
      phone: userData.phone || "",
      address: userData.address || "",
      city: userData.city || "",
      state: userData.state || "",
    };

    const authData: AuthToken = {
      token: token,
      user: user,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    };

    localStorage.setItem(AUTH_TOKEN_KEY, JSON.stringify(authData));
    setIsAuthenticated(true);
    setCurrentUser(user);
  }, []);

  return {
    isAuthenticated,
    currentUser,
    register,
    login,
    logout,
    getToken,
    refreshAuthState,
    saveAuthAfterVerification,
  };
}
