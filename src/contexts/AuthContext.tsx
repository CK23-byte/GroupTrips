import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '../types';

// Debug logging helper - ALWAYS ON for now to diagnose payment return issue
function authLog(message: string, data?: unknown) {
  const timestamp = new Date().toISOString().split('T')[1].slice(0, 12);
  console.log(`[${timestamp}][Auth] ${message}`, data !== undefined ? data : '');
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

    // Create fallback user that we can use if anything goes wrong
    const fallbackUser = {
      id: userId,
      email,
      name: email.split('@')[0],
      created_at: new Date().toISOString()
    } as User;

    // Use a flag-based timeout that's guaranteed to work
    let completed = false;

    // Set up timeout - if query doesn't complete in 3 seconds, use fallback
    const timeoutId = setTimeout(() => {
      if (!completed) {
        completed = true;
        authLog('Profile fetch timed out after 3s, using fallback user');
        setUser(fallbackUser);
        setLoading(false);
        initializationComplete.current = true;
      }
    }, 3000);

    try {
      authLog('Starting Supabase query...');
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      // Clear timeout and check if we already timed out
      clearTimeout(timeoutId);
      if (completed) {
        authLog('Query completed but timeout already fired, ignoring result');
        return;
      }
      completed = true;

      authLog('Query completed', { hasData: !!data, hasError: !!error });

      if (error) {
        authLog('Error fetching user profile', { code: error.code, message: error.message });

        // If profile doesn't exist, try to create it in background
        if (error.code === 'PGRST116') {
          authLog('Profile not found, creating one in background');
          supabase.from('users').insert({
            id: userId,
            email,
            name: fallbackUser.name
          }).then(({ error: insertError }) => {
            if (insertError) {
              authLog('Could not create profile', insertError.message);
            } else {
              authLog('Profile created successfully');
            }
          });
        }

        // Use fallback user immediately
        authLog('Using fallback user');
        setUser(fallbackUser);
      } else if (data) {
        authLog('Profile fetched successfully', { id: data.id, name: data.name });
        setUser(data as User);
      } else {
        authLog('No profile data, using fallback');
        setUser(fallbackUser);
      }
    } catch (err) {
      clearTimeout(timeoutId);
      if (completed) return;
      completed = true;

      const errorMessage = err instanceof Error ? err.message : String(err);
      authLog('Exception in fetchUserProfile', errorMessage);
      setUser(fallbackUser);
    } finally {
      if (completed) {
        authLog('fetchUserProfile complete, setting loading to false');
        setLoading(false);
        initializationComplete.current = true;
      }
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
