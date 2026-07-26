import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/app/lib/supabase';

export interface User {
  id: string;
  name: string;
  email: string;
  grade_level: 'NSSCO' | 'NSSCAS';
  subscription_status: 'Free' | 'VIP';
  expiry_date: string | null;
  is_admin: boolean;
}

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isVIP: boolean;
  isAdmin: boolean;
  login: (email: string) => Promise<boolean>;
  signup: (name: string, email: string, gradeLevel: string) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType>({
  user: null,
  setUser: () => {},
  isVIP: false,
  isAdmin: false,
  login: async () => false,
  signup: async () => false,
  logout: () => {},
  refreshUser: async () => {},
});

export const useUser = () => useContext(UserContext);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const isVIP = user?.subscription_status === 'VIP' && 
    (!user.expiry_date || new Date(user.expiry_date) > new Date());
  const isAdmin = user?.is_admin === true;

  const login = async (email: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .single();
      
      if (error || !data) return false;
      setUser(data as User);
      return true;
    } catch {
      return false;
    }
  };

  const signup = async (name: string, email: string, gradeLevel: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert({
          name: name.trim(),
          email: email.toLowerCase().trim(),
          grade_level: gradeLevel,
          subscription_status: 'Free',
        })
        .select()
        .single();
      
      if (error || !data) return false;
      setUser(data as User);
      return true;
    } catch {
      return false;
    }
  };

  const logout = () => {
    setUser(null);
  };

  const refreshUser = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      if (data) setUser(data as User);
    } catch {}
  };

  return (
    <UserContext.Provider value={{ user, setUser, isVIP, isAdmin, login, signup, logout, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
}
