import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '../types';

// Debug logging helper
const DEBUG = true;
function authLog(message: string, data?: unknown) {
  if (DEBUG) {
    console.log(`[Auth] ${message}`, data !== undefined ? data : '');
  }
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signInWithApple: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const initializationComplete = useRef(false);

  useEffect(() => {
    authLog('AuthProvider mounted, starting initialization');

    // Timeout failsafe - if auth takes more than 10 seconds, stop loading
    const timeoutId = setTimeout(() => {
      if (loading && !initializationComplete.current) {
        authLog('Auth timeout - forcing loading to false');
        setLoading(false);
      }
    }, 10000);

    // Check active session
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        authLog('getSession result', { hasSession: !!session, error: error?.message });

        if (error) {
          authLog('getSession error', error);
          setLoading(false);
          initializationComplete.current = true;
          return;
        }

        if (session?.user) {
          authLog('Session found, fetching profile', { userId: session.user.id });
          fetchUserProfile(session.user.id, session.user.email || '');
        } else {
          authLog('No session found');
          setLoading(false);
          initializationComplete.current = true;
        }
      })
      .catch((err) => {
        authLog('getSession exception', err);
        setLoading(false);
        initializationComplete.current = true;
      });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        authLog('Auth state change', { event, hasSession: !!session });

        if (event === 'INITIAL_SESSION') {
          // Initial session is handled by getSession above
          authLog('INITIAL_SESSION event - skipping (handled by getSession)');
          return;
        }

        if (event === 'SIGNED_IN' && session?.user) {
          authLog('SIGNED_IN event, fetching profile');
          await fetchUserProfile(session.user.id, session.user.email || '');
        } else if (event === 'SIGNED_OUT') {
          authLog('SIGNED_OUT event');
          setUser(null);
          setLoading(false);
        } else if (event === 'TOKEN_REFRESHED') {
          authLog('TOKEN_REFRESHED event');
          // Token was refreshed, user should already be set
        } else if (event === 'USER_UPDATED') {
          authLog('USER_UPDATED event');
          if (session?.user) {
            await fetchUserProfile(session.user.id, session.user.email || '');
          }
        }
      }
    );

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  async function fetchUserProfile(userId: string, email: string) {
    authLog('fetchUserProfile started', { userId, email });
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        authLog('Error fetching user profile', { code: error.code, message: error.message });

        // If profile doesn't exist, create it
        if (error.code === 'PGRST116') {
          authLog('Profile not found, creating new profile');
          const name = email.split('@')[0];
          const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert({ id: userId, email, name })
            .select()
            .single();

          if (insertError) {
            authLog('Error creating user profile', insertError);
            // Still set user with basic info so app works
            setUser({ id: userId, email, name, created_at: new Date().toISOString() } as User);
          } else {
            authLog('Profile created successfully', newUser);
            setUser(newUser as User);
          }
        } else {
          // Other error - still allow login with basic user info
          authLog('Using fallback user (profile fetch error)');
          setUser({ id: userId, email, name: email.split('@')[0], created_at: new Date().toISOString() } as User);
        }
      } else {
        authLog('Profile fetched successfully', data);
        setUser(data as User);
      }
    } catch (err) {
      authLog('Unexpected error fetching profile', err);
      // Fallback - allow login even if profile fetch fails
      setUser({ id: userId, email, name: email.split('@')[0], created_at: new Date().toISOString() } as User);
    } finally {
      authLog('fetchUserProfile complete, setting loading to false');
      setLoading(false);
      initializationComplete.current = true;
    }
  }

  async function signIn(email: string, password: string) {
    authLog('signIn started', { email });
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        authLog('signIn error', error.message);
        return { error: error.message };
      }

      authLog('signIn successful - waiting for auth state change');
      // Note: setLoading(false) will be called by fetchUserProfile via onAuthStateChange
      return { error: null };
    } catch (err) {
      authLog('signIn exception', err);
      return { error: 'An unexpected error occurred. Please try again.' };
    }
  }

  async function signUp(email: string, password: string, name: string) {
    authLog('signUp started', { email, name });
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name }
        }
      });

      if (error) {
        authLog('signUp error', error.message);
        return { error: error.message };
      }

      // Create user profile
      if (data.user) {
        authLog('signUp successful, creating profile', { userId: data.user.id });
        const { error: profileError } = await supabase.from('users').insert({
          id: data.user.id,
          email,
          name,
        });

        if (profileError) {
          authLog('Profile creation error (non-fatal)', profileError);
          // Don't fail registration if profile creation fails
          // The fetchUserProfile will create it on next login
        } else {
          authLog('Profile created successfully');
        }
      }

      return { error: null };
    } catch (err) {
      authLog('signUp exception', err);
      return { error: 'An unexpected error occurred. Please try again.' };
    }
  }

  async function signInWithGoogle() {
    authLog('signInWithGoogle started');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) {
        authLog('signInWithGoogle error', error.message);
        return { error: error.message };
      }
      authLog('signInWithGoogle - redirecting to Google');
      return { error: null };
    } catch (err) {
      authLog('signInWithGoogle exception', err);
      return { error: 'An unexpected error occurred. Please try again.' };
    }
  }

  async function signInWithApple() {
    authLog('signInWithApple started');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) {
        authLog('signInWithApple error', error.message);
        return { error: error.message };
      }
      authLog('signInWithApple - redirecting to Apple');
      return { error: null };
    } catch (err) {
      authLog('signInWithApple exception', err);
      return { error: 'An unexpected error occurred. Please try again.' };
    }
  }

  async function signOut() {
    authLog('signOut started');
    try {
      await supabase.auth.signOut();
      authLog('signOut successful');
      setUser(null);
    } catch (err) {
      authLog('signOut exception', err);
      // Force clear user even if signOut fails
      setUser(null);
    }
  }

  async function updateProfile(updates: Partial<User>) {
    if (!user) return { error: 'Not authenticated' };

    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id);

    if (error) {
      return { error: error.message };
    }

    setUser({ ...user, ...updates });
    return { error: null };
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        signInWithGoogle,
        signInWithApple,
        signOut,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
