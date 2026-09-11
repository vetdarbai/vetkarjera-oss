'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { usePathname } from 'next/navigation';
import { dismissVerificationSuccess, readActiveAccount } from '@/app/auth/actions';

type Account = Awaited<ReturnType<typeof readActiveAccount>>;
const SessionContext = createContext<{ user: Account; verified: boolean }>({ user: null, verified: false });
export const useAuthSession = () => useContext(SessionContext);

export default function AuthSession({ initialUser, verified, children }: { initialUser: Account; verified: boolean; children: React.ReactNode }) {
  const [user, setUser] = useState(initialUser);
  const [showVerified, setShowVerified] = useState(verified);
  const pathname = usePathname();
  const arrivalPath = useRef(pathname);
  useEffect(() => { if (pathname !== arrivalPath.current) setShowVerified(false); }, [pathname]);
  const dismissed = useRef(false);
  useEffect(() => { setUser(initialUser); }, [initialUser]);
  useEffect(() => {
    if (verified && !dismissed.current) {
      dismissed.current = true;
      void dismissVerificationSuccess().catch(() => { dismissed.current = false; });
    }
  }, [verified]);
  useEffect(() => {
    let alive = true;
    let revision = 0;
    const refresh = () => {
      const current = ++revision;
      void readActiveAccount().then(account => {
        if (alive && current === revision) setUser(account);
      }).catch(() => { if (alive && current === revision) setUser(null); });
    };
    const { data: { subscription } } = createClient().auth.onAuthStateChange(event => {
      if (event === 'SIGNED_OUT') { ++revision; setUser(null); }
      else if (event !== 'INITIAL_SESSION') refresh();
    });
    window.addEventListener('focus', refresh);
    window.addEventListener('pageshow', refresh);
    return () => { alive = false; subscription.unsubscribe(); window.removeEventListener('focus', refresh); window.removeEventListener('pageshow', refresh); };
  }, []);
  return <SessionContext.Provider value={{ user, verified: showVerified && !!user }}>{children}</SessionContext.Provider>;
}
