import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase.js';
import { admin } from '../../lib/api.js';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  async function verify(s) {
    if (!s) { setIsAdmin(false); return; }
    try { await admin.get('/settings'); setIsAdmin(true); } // server verifies the admin role
    catch { setIsAdmin(false); }
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session); await verify(data.session); setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, s) => {
      setSession(s); await verify(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error('Invalid email or password');
  };
  const signOut = () => supabase.auth.signOut();

  return <Ctx.Provider value={{ session, isAdmin, loading, signIn, signOut }}>{children}</Ctx.Provider>;
}
