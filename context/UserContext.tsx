import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import Purchases, { CustomerInfo } from 'react-native-purchases';
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
  subjects?: string[];
}

export interface Bookmark {
  id: string;
  item_id: string;
  item_type: 'paper' | 'quiz';
  title: string;
  metadata?: any;
  created_at?: string;
}

interface UserContextType {
  user: UserProfile | null;
  isVIP: boolean;
  isAdmin: boolean;
  loading: boolean;
  bookmarks: Bookmark[];
  streak: number;
  customerInfo: CustomerInfo | null;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string, gradeLevel: 'NSSCO' | 'NSSCAS') => Promise<boolean>;
  updateProfile: (updatedData: { name?: string; grade_level?: 'NSSCO' | 'NSSCAS'; school?: string; subjects?: string[]; avatar_file?: { uri: string; type: string; name: string } }) => Promise<boolean>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  toggleBookmark: (item_id: string, item_type: 'paper' | 'quiz', title: string, metadata?: any) => Promise<void>;
  isBookmarked: (item_id: string) => boolean;
  manageSubscriptions: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [streak, setStreak] = useState(0);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);

  useEffect(() => {
    if (Platform.OS === 'android') {
      Purchases.configure({ apiKey: 'test_oSVyOEnHjEbvrqVFIuuoXvqdhkR' });
    }

    const customerInfoListener = (info: CustomerInfo) => {
      setCustomerInfo(info);
    };
    Purchases.addCustomerInfoUpdateListener(customerInfoListener);

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await fetchUserProfile(session.user.id);
        try {
          const { customerInfo } = await Purchases.logIn(session.user.id);
          setCustomerInfo(customerInfo);
        } catch (e) {
          console.error('RevenueCat logIn error:', e);
        }
      } else {
        setUser(null);
        setCustomerInfo(null);
        try {
          await Purchases.logOut();
        } catch (e) {
          console.error('RevenueCat logOut error:', e);
        }
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
      Purchases.removeCustomerInfoUpdateListener(customerInfoListener);
    };
  }, []);

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await fetchUserProfile(session.user.id);
        try {
          const { customerInfo } = await Purchases.logIn(session.user.id);
          setCustomerInfo(customerInfo);
        } catch (e) {
          console.error('RevenueCat logIn error:', e);
        }
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
        fetchBookmarks(data.id);
        updateUserStreak(data.id);
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
    try {
      await Purchases.logOut();
    } catch (e) {
      console.error('RevenueCat logOut error:', e);
    }
    setUser(null);
    setCustomerInfo(null);
    setBookmarks([]);
  };

  const refreshUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await fetchUserProfile(session.user.id);
    }
  };

  // ── Bookmark functions ──
  const fetchBookmarks = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('bookmarks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (data) setBookmarks(data);
      if (error) console.error('Fetch bookmarks error:', error.message);
    } catch (err) {
      console.error('Fetch bookmarks exception:', err);
    }
  };

  const toggleBookmark = async (item_id: string, item_type: 'paper' | 'quiz', title: string, metadata?: any) => {
    if (!user) return;
    const existing = bookmarks.find(b => b.item_id === item_id);
    if (existing) {
      // Remove bookmark
      const { error } = await supabase.from('bookmarks').delete().eq('id', existing.id);
      if (!error) {
        setBookmarks(prev => prev.filter(b => b.id !== existing.id));
      }
    } else {
      // Add bookmark
      const { data, error } = await supabase
        .from('bookmarks')
        .insert({ user_id: user.id, item_id, item_type, title, metadata })
        .select()
        .single();
      if (data && !error) {
        setBookmarks(prev => [data, ...prev]);
      }
    }
  };

  const isBookmarkedFn = (item_id: string): boolean => {
    return bookmarks.some(b => b.item_id === item_id);
  };

  // ── Streak functions ──
  const updateUserStreak = async (userId: string) => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('user_streaks')
        .select('*')
        .eq('user_id', userId)
        .single();
        
      if (error && error.code !== 'PGRST116') {
        console.error('Streak fetch error:', error.message);
        return;
      }

      if (!data) {
        // No streak record yet, create one
        const { error: insertErr } = await supabase
          .from('user_streaks')
          .insert({
            user_id: userId,
            current_streak: 1,
            longest_streak: 1,
            last_active_date: todayStr
          });
        if (!insertErr) setStreak(1);
        return;
      }

      const lastActive = data.last_active_date;
      if (lastActive === todayStr) {
        // Already active today, just set streak
        setStreak(data.current_streak);
        return;
      }

      // Check if active yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      let newStreak = 1;
      if (lastActive === yesterdayStr) {
        newStreak = data.current_streak + 1;
      }

      const longestStreak = Math.max(newStreak, data.longest_streak || 0);

      const { error: updateErr } = await supabase
        .from('user_streaks')
        .update({
          current_streak: newStreak,
          longest_streak: longestStreak,
          last_active_date: todayStr
        })
        .eq('user_id', userId);

      if (!updateErr) setStreak(newStreak);
    } catch (err) {
      console.error('Streak exception:', err);
    }
  };

  const manageSubscriptions = async () => {
    try {
      if (Platform.OS === 'android') {
        await Purchases.showManageSubscriptions();
      }
    } catch (error) {
      console.error('Error opening subscription management:', error);
    }
  };

  const hasRevenueCatVIP = customerInfo?.entitlements.active['NamibStudy Prep Pro'] !== undefined;
  const isVIP = user?.subscription_status === 'VIP' || (user?.expiry_date ? new Date(user.expiry_date) > new Date() : false) || hasRevenueCatVIP;
  const isAdmin = user?.is_admin === true || user?.role === 'admin';

  return (
    <UserContext.Provider value={{ user, isVIP, isAdmin, loading, bookmarks, streak, customerInfo, login, signup, logout, refreshUser, updateProfile, updatePassword, toggleBookmark, isBookmarked: isBookmarkedFn, manageSubscriptions }}>
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