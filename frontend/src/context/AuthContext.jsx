import React, { createContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Hard fail-safe: Force stop loading after 5 seconds no matter what
    const failSafe = setTimeout(() => {
      setLoading(false);
    }, 5000);

    // Check initial session
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (session?.user) {
          await fetchProfile(session.user.id, session.user.email);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error('Session error:', err);
        setLoading(false);
      }
    };
    getSession();

    // Listen to changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await fetchProfile(session.user.id, session.user.email);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(failSafe);
      subscription?.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId, email) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (data) {
        // Map Supabase 'id' to '_id' so existing frontend code works without huge refactoring
        setUser({ _id: data.id, id: data.id, username: data.username, email, plan: data.plan });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error("Login failed");
    return data;
  };

  const register = async (username, email, password) => {
    // 1. Register with Auth
    const { data: authData, error: authErr } = await supabase.auth.signUp({ email, password });
    if (authErr) throw new Error(authErr.message);
    if (!authData.user) throw new Error("Signup failed");
    
    // 2. Insert into Profiles
    const { error: profileErr } = await supabase
      .from('profiles')
      .insert([{ id: authData.user.id, username }]);
      
    if (profileErr) {
      // Cleanup if failed
      console.error(profileErr);
      throw new Error("Failed to create profile");
    }
    
    return authData;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const updateUser = (data) => setUser(prev => ({ ...prev, ...data }));

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};
