import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  grade_level: 'NSSCO' | 'NSSCAS';
  subscription_status: string;
  expiry_date: string | null;
  is_admin: boolean;
  role?: string;
  avatar_url?: string | null;
  school?: string | null;
  subjects?: string[]; // NEW: Added subjects array
}

interface UserContextType {
  user: UserProfile | null;
  isVIP: boolean;
  isAdmin: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string, gradeLevel: 'NSSCO' | 'NSSCAS') => Promise<boolean>;
  updateProfile: (updatedData: { name?: string; grade_level?: 'NSSCO' | 'NSSCAS'; school?: string; subjects?: string[]; avatar_file?: { uri: string; type: string; name: string } }) => Promise<boolean>; // NEW: Added subjects to signature
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await fetchUserProfile(session.user.id);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await fetchUserProfile(session.user.id);
      }
    } catch (error) {
      console.error('Session check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error.message);
        setUser(null);
      } else if (data) {
        setUser({
          ...data,
          isAdmin: data.is_admin === true || data.role === 'admin',
        });
      }
    } catch (err) {
      console.error('Unexpected profile fetch error:', err);
      setUser(null);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Login error:', error.message);
        return false;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await fetchUserProfile(session.user.id);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Login exception:', err);
      return false;
    }
  };

  const signup = async (
    name: string,
    email: string,
    password: string,
    gradeLevel: 'NSSCO' | 'NSSCAS'
  ): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            grade_level: gradeLevel,
          },
        },
      });

      if (error) {
        console.error('Signup error:', error.message);
        return false;
      }

      if (data.user) {
        await fetchUserProfile(data.user.id);
      }
      return true;
    } catch (err) {
      console.error('Signup exception:', err);
      return false;
    }
  };

  const updateProfile = async (updatedData: {
    name?: string;
    grade_level?: 'NSSCO' | 'NSSCAS';
    school?: string;
    subjects?: string[];
    avatar_file?: { uri: string; type: string; name: string }
  }): Promise<boolean> => {
    try {
      if (!user) return false;

      let avatarUrl = user.avatar_url;

      if (updatedData.avatar_file) {
        const fileExt = updatedData.avatar_file.name.split('.').pop() || 'jpg';
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const formData = new FormData();
        formData.append('file', {
          uri: updatedData.avatar_file.uri,
          name: fileName,
          type: updatedData.avatar_file.type,
        } as any);

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, formData, {
            upsert: true,
          });

        if (uploadError) {
          console.error('Avatar upload error:', uploadError.message);
          return false;
        }

        const { data: publicURLData } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        avatarUrl = publicURLData.publicUrl;
      }

      const updatePayload: any = {};
      if (updatedData.name !== undefined) updatePayload.name = updatedData.name;
      if (updatedData.grade_level !== undefined) updatePayload.grade_level = updatedData.grade_level;
      if (updatedData.school !== undefined) updatePayload.school = updatedData.school;
      if (updatedData.subjects !== undefined) updatePayload.subjects = updatedData.subjects; // NEW: Added to payload
      if (avatarUrl !== undefined) updatePayload.avatar_url = avatarUrl;

      const { error: dbError } = await supabase
        .from('users')
        .update(updatePayload)
        .eq('id', user.id);

      if (dbError) {
        console.error('Profile update error:', dbError.message);
        return false;
      }

      await fetchUserProfile(user.id);
      return true;
    } catch (err) {
      console.error('Profile update exception:', err);
      return false;
    }
  };

  const updatePassword = async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const refreshUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await fetchUserProfile(session.user.id);
    }
  };

  const isVIP = user?.subscription_status === 'VIP' || (user?.expiry_date ? new Date(user.expiry_date) > new Date() : false);
  const isAdmin = user?.is_admin === true || user?.role === 'admin';

  return (
    <UserContext.Provider value={{ user, isVIP, isAdmin, loading, login, signup, logout, refreshUser, updateProfile, updatePassword }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}