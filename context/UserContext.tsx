import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Platform, View, ActivityIndicator } from 'react-native';
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
  school_id?: string | null;
  school_logo_url?: string | null;
  school_locked?: boolean;
  is_school_admin?: boolean;
  subjects?: string[];
}

export interface Bookmark {
  id: string;
  item_id: string;
  item_type: 'paper' | 'quiz';
  title: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
}

interface UserContextType {
  user: UserProfile | null;
  isPro: boolean | undefined;
  isAdmin: boolean;
  loading: boolean;
  bookmarks: Bookmark[];
  streak: number;
  onlineUsersCount: number;
  customerInfo: CustomerInfo | null;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string, gradeLevel: 'NSSCO' | 'NSSCAS', role: 'student' | 'teacher', schoolId?: string | null, schoolName?: string | null) => Promise<boolean>;
  updateProfile: (updatedData: { name?: string; grade_level?: 'NSSCO' | 'NSSCAS'; school?: string; school_id?: string; school_locked?: boolean; is_school_admin?: boolean; subjects?: string[]; avatar_file?: { uri: string; type: string; name: string } }) => Promise<boolean>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  toggleBookmark: (item_id: string, item_type: 'paper' | 'quiz', title: string, metadata?: Record<string, unknown>) => Promise<void>;
  isBookmarked: (item_id: string) => boolean;
  manageSubscriptions: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
  uploadSchoolLogo: (file: { uri: string; type: string; name: string }, schoolId: string) => Promise<string | null>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [streak, setStreak] = useState(0);
  const [onlineUsersCount, setOnlineUsersCount] = useState(0);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);

  // Ref to hold latest user for stable access inside listeners (avoids stale closures)
  const userRef = useRef<UserProfile | null>(user);
  userRef.current = user;

  // Supabase Realtime Presence
  useEffect(() => {
    const channel = supabase.channel('namstudy-presence');
    
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      let count = 0;
      for (const key in state) {
        count += state[key].length;
      }
      setOnlineUsersCount(count);
    }).subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        // Track presence regardless of auth state (anonymous guests are counted too)
        await channel.track({ user: userRef.current?.id || `guest-${Math.random().toString(36).substring(7)}` });
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  /**
   * Sync RevenueCat subscription state to Supabase.
   * Only writes to the database when the status actually differs.
   * Only updates local React state after a successful DB write.
   */
  const syncRevenueCatToSupabase = async (info: CustomerInfo, userId: string) => {
    try {
      const hasEntitlement = info.entitlements.active['NamibStudy Prep Pro'] !== undefined;
      const targetStatus = hasEntitlement ? 'VIP' : 'FREE';

      // Compare before writing — skip if already correct
      if (userRef.current?.subscription_status === targetStatus) return;

      // Update Supabase
      const { error } = await supabase
        .from('users')
        .update({ subscription_status: targetStatus })
        .eq('id', userId);

      if (error) {
        console.error('Sync RevenueCat → Supabase error:', error.message);
        return; // Do NOT update local state on failure
      }

      // Only update local state after successful DB write
      setUser(prev => prev ? { ...prev, subscription_status: targetStatus } : prev);
    } catch (err) {
      console.error('Sync RevenueCat → Supabase exception:', err);
    }
  };

  useEffect(() => {
    if (Platform.OS !== 'web' && Platform.OS === 'android') {
      Purchases.configure({ apiKey: 'goog_tJlncTghUDnHSBUfHKUcvVEFEAK' });
    }

    const customerInfoListener = (info: CustomerInfo) => {
      setCustomerInfo(info);
      // Sync subscription status to Supabase when RevenueCat state changes
      const currentUserId = userRef.current?.id;
      if (currentUserId) {
        syncRevenueCatToSupabase(info, currentUserId);
      }
    };
    if (Platform.OS !== 'web') {
      Purchases.addCustomerInfoUpdateListener(customerInfoListener);
    }

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await fetchUserProfile(session.user.id);
        try {
          if (Platform.OS !== 'web') {
            const { customerInfo } = await Purchases.logIn(session.user.id);
            setCustomerInfo(customerInfo);
            await syncRevenueCatToSupabase(customerInfo, session.user.id);
          }
        } catch (e) {
          console.error('RevenueCat logIn error:', e);
        }
      } else {
        setUser(null);
        setCustomerInfo(null);
        try {
          if (Platform.OS !== 'web') {
            await Purchases.logOut();
          }
        } catch (e) {
          console.error('RevenueCat logOut error:', e);
        }
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
      if (Platform.OS !== 'web') {
        Purchases.removeCustomerInfoUpdateListener(customerInfoListener);
      }
    };
  }, []);

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await fetchUserProfile(session.user.id);
        try {
          if (Platform.OS !== 'web') {
            const { customerInfo } = await Purchases.logIn(session.user.id);
            setCustomerInfo(customerInfo);
            await syncRevenueCatToSupabase(customerInfo, session.user.id);
          }
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
      let data = null;
      let error = null;
      // Retry loop to handle the Supabase auth trigger race condition (slow local DBs)
      for (let i = 0; i < 5; i++) {
        const result = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        
        data = result.data;
        error = result.error;

        if (error) {
          break; // Hard DB error, stop retrying
        }

        if (!data) {
          // If 0 rows returned (trigger hasn't fired yet), wait 1000ms and retry
          await new Promise(res => setTimeout(res, 1000));
        } else {
          break; // Success, exit retry loop
        }
      }

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
    gradeLevel: 'NSSCO' | 'NSSCAS',
    role: 'student' | 'teacher',
    schoolId?: string | null,
    schoolName?: string | null
  ): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            grade_level: gradeLevel,
            role,
            school_id: schoolId || null,
            school: schoolName || null,
            school_locked: !!schoolId,
          },
        },
      });

      if (error) {
        console.error('Signup error:', error.message);
        return false;
      }

      if (data.user && data.session) {
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
    school_id?: string;
    school_locked?: boolean;
    is_school_admin?: boolean;
    subjects?: string[];
    avatar_file?: { uri: string; type: string; name: string }
  }): Promise<boolean> => {
    try {
      if (!user) return false;

      let avatarUrl = user.avatar_url;

      if (updatedData.avatar_file) {
        const fileExt = updatedData.avatar_file.name.split('.').pop() || 'jpg';
        const filePath = `${user.id}/avatar.${fileExt}`;
        const contentType = updatedData.avatar_file.type || `image/${fileExt === 'png' ? 'png' : 'jpeg'}`;

        try {
          // Convert local file URI to binary data for Supabase Storage
          const response = await fetch(updatedData.avatar_file.uri);
          const arrayBuffer = await response.arrayBuffer();

          const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, arrayBuffer, {
              upsert: true,
              contentType,
            });

          if (uploadError) {
            console.error('Avatar upload error:', uploadError.message);
            return false;
          }

          const { data: publicURLData } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);

          // Append cache-busting timestamp so the UI reflects the new avatar immediately
          avatarUrl = `${publicURLData.publicUrl}?t=${Date.now()}`;
        } catch (uploadErr) {
          console.error('Avatar binary conversion/upload exception:', uploadErr);
          return false;
        }
      }

      const payload: any = {};
      if (updatedData.name !== undefined) payload.name = updatedData.name;
      if (updatedData.grade_level !== undefined) payload.grade_level = updatedData.grade_level;
      if (updatedData.school !== undefined) payload.school = updatedData.school;
      if (updatedData.school_id !== undefined) payload.school_id = updatedData.school_id;
      // school_locked and is_school_admin are strictly controlled by server-side RPCs.
      if (updatedData.subjects !== undefined) payload.subjects = updatedData.subjects;
      if (avatarUrl !== user.avatar_url) payload.avatar_url = avatarUrl;

      const { error: dbError } = await supabase
        .from('users')
        .update(payload)
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
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    try {
      if (Platform.OS !== 'web') {
        await Purchases.logOut();
      }
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

  const toggleBookmark = async (item_id: string, item_type: 'paper' | 'quiz', title: string, metadata?: Record<string, unknown>) => {
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

  const refreshSubscription = async () => {
    try {
      if (Platform.OS === 'web') return;
      const info = await Purchases.getCustomerInfo();
      setCustomerInfo(info);
      const currentUserId = userRef.current?.id;
      if (currentUserId) {
        await syncRevenueCatToSupabase(info, currentUserId);
      }
    } catch (error) {
      console.error('Error refreshing subscription:', error);
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

  const uploadSchoolLogo = async (file: { uri: string; type: string; name: string }, schoolId: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${schoolId}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const response = await fetch(file.uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('school-logos')
        .upload(filePath, blob, { 
          upsert: true,
          contentType: blob.type || 'image/jpeg' 
        });

      if (uploadError) {
        console.error('School logo upload error:', uploadError.message);
        return null;
      }

      const { data: publicURLData } = supabase.storage
        .from('school-logos')
        .getPublicUrl(filePath);

      return publicURLData.publicUrl;
    } catch (err) {
      console.error('School logo upload exception:', err);
      return null;
    }
  };

  const hasRevenueCatEntitlement = customerInfo?.entitlements.active['NamibStudy Prep Pro'] !== undefined;
  const isRevenueCatPlatform = Platform.OS !== 'web';

  let isPro: boolean | undefined = undefined;
  if (loading) {
    isPro = undefined;
  } else if (isRevenueCatPlatform) {
    // Native: RevenueCat is the sole subscription authority.
    if (customerInfo === null) {
      // RevenueCat still initializing — do NOT fall back to stale Supabase data.
      isPro = undefined;
    } else {
      // RevenueCat has resolved — use its entitlement as the single source of truth.
      // Stale Supabase subscription_status cannot override this.
      isPro = hasRevenueCatEntitlement;
    }
  } else {
    // Web (or any platform where RevenueCat is unavailable by design) — Supabase fallback.
    isPro = user?.subscription_status === 'VIP'
         || user?.subscription_status === 'Pro'
         || (user?.expiry_date ? new Date(user.expiry_date) > new Date() : false);
  }
  
  const isAdmin = user?.is_admin === true || user?.role === 'admin';

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
        <ActivityIndicator size="large" color="#0EA5E9" />
      </View>
    );
  }

  return (
    <UserContext.Provider value={{ user, isPro, isAdmin, loading, bookmarks, streak, onlineUsersCount, customerInfo, login, signup, logout, refreshUser, updateProfile, updatePassword, toggleBookmark, isBookmarked: isBookmarkedFn, manageSubscriptions, refreshSubscription, uploadSchoolLogo }}>
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