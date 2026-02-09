import React, { createContext, useContext, useEffect } from "react";
import { useIsAuthenticated, useMsal, useAccount } from "@azure/msal-react";
import { useEmailAuth } from "@/hooks/useEmailAuth";
import { useEmailAuthState } from "@/hooks/useEmailAuthState";

interface AuthContextType {
  isAuthenticated: boolean;
  user: any;
  currentUser?: any;
  accounts: any[];
  logout: () => Promise<void>;
  getToken: () => string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const microsoftIsAuthenticated = useIsAuthenticated();
  const { accounts, instance } = useMsal();
  const account = useAccount();
  const emailAuth = useEmailAuth();
  const emailAuthState = useEmailAuthState();

  // Get user directly from localStorage for email auth
  const getEmailUser = () => {
    const AUTH_TOKEN_KEY = "blood_bank_auth_token";
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return null;
    try {
      const authData = JSON.parse(token);
      if (authData.expiresAt && authData.expiresAt < Date.now()) {
        return null;
      }
      return authData.user;
    } catch {
      return null;
    }
  };

  // Initialize auth state on mount
  useEffect(() => {
    console.log("🔐 AuthProvider mounted, refreshing auth state...");
    emailAuth.refreshAuthState();
  }, []);

  // User is authenticated if either Microsoft or email auth is valid
  const isAuthenticated = microsoftIsAuthenticated || emailAuthState;

  // Determine which user object to use - prioritize email auth from localStorage
  const emailUser = getEmailUser();
  const currentUserData = emailUser || emailAuth.currentUser || account;

  console.log("🔐 AuthContext - currentUserData:", currentUserData);

  const logout = async () => {
    emailAuth.logout();
    if (microsoftIsAuthenticated) {
      try {
        await instance.logoutPopup({
          postLogoutRedirectUri: "/",
        });
      } catch (error) {
        console.error("Logout error:", error);
      }
    }
  };

  const getToken = () => {
    // Try to get email auth token first
    const emailToken = emailAuth.getToken();
    if (emailToken) return emailToken;

    // For Microsoft auth, token is handled by MSAL internally
    return null;
  };

  const value: AuthContextType = {
    isAuthenticated,
    user: currentUserData,
    currentUser: currentUserData,
    accounts,
    logout,
    getToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
