
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  login: (email: string) => void;
  signup: (name: string, email: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
      const saved = localStorage.getItem('studygenius_user');
      return saved ? JSON.parse(saved) : null;
  });

  const login = (email: string) => {
    // Mock login
    const mockUser: User = {
        id: 'user-1',
        name: email.split('@')[0], // Extract name from email for demo
        email: email,
        avatar: `https://ui-avatars.com/api/?name=${email.split('@')[0]}&background=0D8ABC&color=fff`
    };
    setUser(mockUser);
    localStorage.setItem('studygenius_user', JSON.stringify(mockUser));
  };

  const signup = (name: string, email: string) => {
      const mockUser: User = {
          id: `user-${Date.now()}`,
          name,
          email,
          avatar: `https://ui-avatars.com/api/?name=${name}&background=0D8ABC&color=fff`
      };
      setUser(mockUser);
      localStorage.setItem('studygenius_user', JSON.stringify(mockUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('studygenius_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
