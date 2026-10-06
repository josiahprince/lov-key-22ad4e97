import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import GradientShell from '@/components/GradientShell';
import LoadingState from '@/components/LoadingState';
import { supabase } from '@/integrations/supabase/client';
import { logError } from '@/lib/errorLogger';

// Same minimum the sign-up form enforces.
const MIN_PASSWORD_LENGTH = 6;

type Status = 'checking' | 'ready' | 'invalid' | 'done';

// Landing page for the "reset your password" email (AuthScreen's forgot
// mode sends it with redirectTo pointing here). supabase-js reads the
// recovery token from the URL and signs the user in, then they choose a new
// password. Lives outside AppLayout so the daily-onboarding gate can't
// redirect them away first.
const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('checking');
  const [linkError, setLinkError] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // initialize() resolves once the client has processed the URL, and
      // reports an expired or already-used link as an error.
      const { error: initError } = await supabase.auth.initialize();
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session) {
        setStatus('ready');
      } else {
        if (initError) logError('ResetPasswordPage:link', initError);
        setLinkError(initError?.message ?? '');
        setStatus('invalid');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setSaving(true);
    setError('');
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setSaving(false);
      setError(updateError.message);
      return;
    }
    // Whoever knew the old password may still be signed in elsewhere.
    await supabase.auth.signOut({ scope: 'others' });
    setSaving(false);
    setStatus('done');
  };

  return (
    <GradientShell centered>
      <Card className="w-full max-w-md p-6 bg-white/80 backdrop-blur-sm shadow-xl space-y-4">
        <div className="text-center">
          <h1 className="font-bold text-primary text-2xl">Reset password</h1>
        </div>

        {status === 'checking' && <LoadingState variant="spinner" label="Checking your link..." />}

        {status === 'invalid' && (
          <div className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              This reset link is invalid or has expired. Links can only be used once and expire after a short time.
            </p>
            {linkError && <p className="text-xs text-muted-foreground">({linkError})</p>}
            <Button className="w-full rounded-xl" onClick={() => navigate('/', { replace: true })}>
              Back to sign in
            </Button>
          </div>
        )}

        {status === 'ready' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-muted-foreground">Choose a new password for your LovKey account.</p>
            <Input
              type="password"
              placeholder="New password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={MIN_PASSWORD_LENGTH}
              required
              className="rounded-xl"
            />
            <Input
              type="password"
              placeholder="Confirm new password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              className="rounded-xl"
            />
            {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-xl">{error}</div>}
            <Button type="submit" disabled={saving} className="w-full rounded-xl">
              {saving ? 'Saving...' : 'Save new password'}
            </Button>
          </form>
        )}

        {status === 'done' && (
          <div className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              Your password has been updated, and any other devices have been signed out.
            </p>
            <Button className="w-full rounded-xl" onClick={() => navigate('/', { replace: true })}>
              Continue to LovKey
            </Button>
          </div>
        )}
      </Card>
    </GradientShell>
  );
};

export default ResetPasswordPage;
