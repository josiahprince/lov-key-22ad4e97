import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '../supabase';
import { errorMessage } from '../errors';
import { useStaff } from '../useStaff';
import { AuthCard } from '../components/AuthCard';

interface Enrolment {
  factorId: string;
  qrCode: string;
  secret: string;
}

// The second step of every staff sign-in. The first time, it sets up an
// authenticator app; after that it asks for the current 6-digit code.
const MfaPage = ({ hasFactor }: { hasFactor: boolean }) => {
  const { signOut, refresh } = useStaff();
  const [enrolment, setEnrolment] = useState<Enrolment | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (hasFactor || started.current) return;
    started.current = true;
    (async () => {
      // A set-up abandoned half way leaves an unverified factor behind, which
      // would make a new one with the same name fail.
      const { data: factors } = await supabase.auth.mfa.listFactors();
      for (const f of factors?.all ?? []) {
        if (f.factor_type === 'totp' && f.status === 'unverified') {
          await supabase.auth.mfa.unenroll({ factorId: f.id });
        }
      }
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'LovKey Admin' });
      if (error) {
        setError(errorMessage(error));
        return;
      }
      setEnrolment({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
    })();
  }, [hasFactor]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    let factorId = enrolment?.factorId;
    if (!factorId) {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      factorId = factors?.totp[0]?.id;
    }
    if (!factorId) {
      setError('No authenticator is set up for this account.');
      setLoading(false);
      return;
    }
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: code.trim() });
    if (error) {
      setError(error.code === 'mfa_verification_failed' ? "That code didn't work. Check the time on your phone and try the newest code." : errorMessage(error));
      setLoading(false);
      return;
    }
    await refresh();
  };

  return (
    <AuthCard
      title={hasFactor ? 'Enter your code' : 'Set up your authenticator'}
      subtitle={hasFactor
        ? 'Open your authenticator app and type the 6-digit code for LovKey Admin.'
        : 'Staff accounts need a second step. Scan this with Google Authenticator, 1Password, Authy or similar, then type the code it shows.'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">{error}</p>}
        {!hasFactor && (
          enrolment ? (
            <div className="space-y-2 text-center">
              <img src={enrolment.qrCode} alt="QR code for your authenticator app" className="mx-auto h-44 w-44 bg-white p-2 rounded-lg border" />
              <p className="text-xs text-muted-foreground">
                Can't scan? Enter this key instead:
                <span className="block font-mono text-foreground break-all mt-1">{enrolment.secret}</span>
              </p>
            </div>
          ) : (
            !error && <p className="text-sm text-muted-foreground text-center">Preparing your QR code…</p>
          )
        )}
        <div className="space-y-2">
          <Label htmlFor="code">6-digit code</Label>
          <Input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading || code.length !== 6 || (!hasFactor && !enrolment)}>
          {loading ? 'Checking…' : 'Continue'}
        </Button>
        <Button type="button" variant="ghost" className="w-full" onClick={() => void signOut()}>
          Use a different account
        </Button>
      </form>
    </AuthCard>
  );
};

export default MfaPage;
