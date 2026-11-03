import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Database } from '@/integrations/supabase/types';
import { supabase } from './supabase';

export type AppRole = Database['public']['Enums']['app_role'];
export type AppPermission = Database['public']['Enums']['app_permission'];

export type StaffState =
  | { status: 'loading' }
  | { status: 'signed_out' }
  | { status: 'needs_mfa'; email: string; hasFactor: boolean }
  | { status: 'ready'; email: string; role: AppRole; permissions: Set<AppPermission> };

interface StaffContextValue {
  state: StaffState;
  // Shown on the sign-in page, e.g. why the last sign-in was refused.
  notice: string;
  refresh: () => Promise<void>;
  signOut: (notice?: string) => Promise<void>;
  can: (permission: AppPermission) => boolean;
}

const StaffContext = createContext<StaffContextValue | null>(null);

// Decides which screen a staff member sees. The order matters:
//   1. No session → sign-in page.
//   2. No staff role → signed straight out. Checked before MFA so members
//      can't enrol an authenticator here.
//   3. Not at aal2 → the authenticator step (set up on first sign-in).
//   4. Otherwise → the app, with the role's permissions to show or hide
//      screens and buttons. The database checks every action again anyway.
export const StaffProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<StaffState>({ status: 'loading' });
  const [notice, setNotice] = useState('');

  const signOut = useCallback(async (message = '') => {
    await supabase.auth.signOut();
    setNotice(message);
    setState({ status: 'signed_out' });
  }, []);

  const refresh = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setState({ status: 'signed_out' });
      return;
    }
    const email = session.user.email ?? '';

    const { data: roleRow, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .maybeSingle();
    if (roleError) {
      await signOut(`Couldn't check your role: ${roleError.message}`);
      return;
    }
    if (!roleRow) {
      await signOut('That account is not a staff account.');
      return;
    }

    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel !== 'aal2') {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      setState({ status: 'needs_mfa', email, hasFactor: (factors?.totp.length ?? 0) > 0 });
      return;
    }

    const { data: perms } = await supabase
      .from('role_permissions')
      .select('permission')
      .eq('role', roleRow.role);
    setState({
      status: 'ready',
      email,
      role: roleRow.role,
      permissions: new Set((perms ?? []).map((p) => p.permission)),
    });
  }, [signOut]);

  useEffect(() => {
    void refresh();
    // Supabase calls this inside its own auth lock, so the follow-up queries
    // run on the next tick to avoid waiting on that lock.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'MFA_CHALLENGE_VERIFIED') {
        setTimeout(() => void refresh(), 0);
      }
    });
    return () => subscription.unsubscribe();
  }, [refresh]);

  const can = useCallback(
    (permission: AppPermission) => state.status === 'ready' && state.permissions.has(permission),
    [state],
  );

  return (
    <StaffContext.Provider value={{ state, notice, refresh, signOut, can }}>
      {children}
    </StaffContext.Provider>
  );
};

export const useStaff = () => {
  const value = useContext(StaffContext);
  if (!value) throw new Error('useStaff must be used inside StaffProvider');
  return value;
};

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: 'Super admin',
  admin: 'Admin',
  ts_lead: 'Trust & Safety lead',
  moderator: 'Moderator',
  verifier: 'Verification reviewer',
  support: 'Support',
  analyst: 'Analyst',
};
