import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RESEND_COOLDOWN_SECONDS } from '@/lib/accountVerification';
import { authErrorMessage } from '@/lib/authErrors';

// Supabase codes are 6 digits unless the project is set to a longer length.
const MIN_CODE_LENGTH = 6;
const MAX_CODE_LENGTH = 10;

interface CodeStepProps {
  channel: 'sms' | 'email';
  // Already formatted for display: "+94 77 123 4567" or "name@example.com".
  sentTo: string;
  onVerify: (code: string) => Promise<void>;
  onResend: () => Promise<void>;
  onChangeDestination: () => void;
  changeLabel: string;
}

// "Enter the code we sent you", shared by phone and email verification.
const CodeStep = ({ channel, sentTo, onVerify, onResend, onChangeDestination, changeLabel }: CodeStepProps) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < MIN_CODE_LENGTH) {
      setError(`Enter the ${MIN_CODE_LENGTH}-digit code.`);
      return;
    }
    setLoading(true);
    setError('');
    setNotice('');
    try {
      await onVerify(code);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setNotice('');
    try {
      await onResend();
      setCode('');
      setSecondsLeft(RESEND_COOLDOWN_SECONDS);
      setNotice('We sent you a new code.');
    } catch (err) {
      setError(authErrorMessage(err));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {channel === 'sms' ? 'We texted a code to ' : 'We emailed a code to '}
        <span className="font-medium text-foreground break-all">{sentTo}</span>.
        {channel === 'email' && " If it isn't there in a minute, check your spam folder."}
      </p>

      <Input
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        aria-label="Verification code"
        placeholder="Code"
        maxLength={MAX_CODE_LENGTH}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
        autoFocus
        className="rounded-xl text-center text-lg tracking-[0.4em]"
      />

      {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-xl">{error}</div>}
      {notice && <div className="text-sm text-foreground bg-accent p-3 rounded-xl">{notice}</div>}

      <Button type="submit" disabled={loading} className="w-full py-3 rounded-xl">
        {loading ? 'Checking...' : 'Verify'}
      </Button>

      <div className="flex justify-between text-sm">
        <button type="button" onClick={onChangeDestination} className="text-primary hover:text-primary/80 transition-colors">
          {changeLabel}
        </button>
        <button
          type="button"
          onClick={handleResend}
          disabled={secondsLeft > 0}
          className="text-primary hover:text-primary/80 transition-colors disabled:text-muted-foreground disabled:cursor-not-allowed"
        >
          {secondsLeft > 0 ? `Resend in ${secondsLeft}s` : 'Resend code'}
        </button>
      </div>
    </form>
  );
};

export default CodeStep;
