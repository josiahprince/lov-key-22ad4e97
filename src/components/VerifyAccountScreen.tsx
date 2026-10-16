import { useState } from 'react';
import type { User } from '@supabase/supabase-js';
import type { CountryCode } from 'libphonenumber-js';
import { Mail, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import GradientShell from '@/components/GradientShell';
import CodeStep from '@/components/auth/CodeStep';
import PhoneNumberInput from '@/components/auth/PhoneNumberInput';
import { defaultPhoneCountry, formatPhone, toE164 } from '@/lib/phone';
import { supabase } from '@/integrations/supabase/client';
import type { VerificationStep } from '@/lib/accountVerification';
import { authErrorMessage } from '@/lib/authErrors';
import { signOut } from '@/lib/signOut';

// verifyOtp updates the user, but refreshing makes sure AppLayout gets the
// confirmed phone or email straight away and moves on to profile setup.
const refreshUser = async () => {
  await supabase.auth.refreshSession();
};

const EmailStep = ({ user }: { user: User }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // An address already waiting for its code (e.g. the app was closed halfway).
  const [codeSentTo, setCodeSentTo] = useState<string | null>(user.new_email ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const address = email.trim().toLowerCase();
    setLoading(true);
    setError('');
    try {
      // Supabase treats adding an email to a phone account as an email change,
      // so the code arrives as an "email_change" code.
      const { error } = await supabase.auth.updateUser({ email: address, password });
      if (error) throw error;
      setCodeSentTo(address);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (codeSentTo) {
    return <CodeStep
      channel="email"
      sentTo={codeSentTo}
      onVerify={async (code) => {
        const { error } = await supabase.auth.verifyOtp({ email: codeSentTo, token: code, type: 'email_change' });
        if (error) throw error;
        await refreshUser();
      }}
      onResend={async () => {
        const { error } = await supabase.auth.resend({ type: 'email_change', email: codeSentTo });
        if (error) throw error;
      }}
      onChangeDestination={() => setCodeSentTo(null)}
      changeLabel="Use a different email"
    />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Add your email and choose a password. We'll email you a code to confirm the address. You can then sign
        in with your phone or with this email and password, and reset your password by email if you ever need to.
      </p>
      <Input type="email" placeholder="Email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required className="rounded-xl" />
      <Input type="password" placeholder="Choose a password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} className="rounded-xl" />
      {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-xl">{error}</div>}
      <Button type="submit" disabled={loading} className="w-full py-3 rounded-xl">
        {loading ? 'Sending...' : 'Send code'}
      </Button>
    </form>
  );
};

const PhoneStep = ({ user }: { user: User }) => {
  const [country, setCountry] = useState<CountryCode>(defaultPhoneCountry);
  const [phoneInput, setPhoneInput] = useState('');
  const [codeSentTo, setCodeSentTo] = useState<string | null>(user.new_phone ? `+${user.new_phone}` : null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const phone = toE164(country, phoneInput);
    if (!phone) {
      setError("That doesn't look like a valid mobile number. Check the country code and the number.");
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.updateUser({ phone });
      if (error) throw error;
      setCodeSentTo(phone);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (codeSentTo) {
    return <CodeStep
      channel="sms"
      sentTo={formatPhone(codeSentTo)}
      onVerify={async (code) => {
        const { error } = await supabase.auth.verifyOtp({ phone: codeSentTo, token: code, type: 'phone_change' });
        if (error) throw error;
        await refreshUser();
      }}
      onResend={async () => {
        const { error } = await supabase.auth.resend({ type: 'phone_change', phone: codeSentTo });
        if (error) throw error;
      }}
      onChangeDestination={() => setCodeSentTo(null)}
      changeLabel="Change number"
    />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Every LovKey account is confirmed with a mobile number. We'll text you a code.
      </p>
      <PhoneNumberInput country={country} onCountryChange={setCountry} number={phoneInput} onNumberChange={setPhoneInput} disabled={loading} />
      {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-xl">{error}</div>}
      <Button type="submit" disabled={loading} className="w-full py-3 rounded-xl">
        {loading ? 'Sending...' : 'Send code'}
      </Button>
    </form>
  );
};

const STEP_COPY: Record<VerificationStep, { title: string; Icon: typeof Mail }> = {
  phone: { title: 'Confirm your mobile number', Icon: Smartphone },
  email: { title: 'Add your email', Icon: Mail },
};

// Shown by AppLayout to new accounts (see pendingVerificationStep) until both
// the phone and the email are confirmed. Profile setup comes after.
const VerifyAccountScreen = ({ user, step }: { user: User; step: VerificationStep }) => {
  const { title, Icon } = STEP_COPY[step];
  return (
    <GradientShell centered>
      <Card className="w-full max-w-md p-6 bg-card/80 backdrop-blur-sm shadow-xl space-y-5">
        <div className="text-center space-y-2">
          <Icon className="w-10 h-10 mx-auto text-primary" />
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Step 2 of 2</p>
          <h1 className="text-xl font-bold text-foreground">{title}</h1>
        </div>
        {/* Keyed so switching steps starts the next one with empty fields. */}
        {step === 'email' ? <EmailStep key="email" user={user} /> : <PhoneStep key="phone" user={user} />}
        <div className="text-center">
          <button type="button" onClick={signOut} className="text-sm text-muted-foreground underline underline-offset-2">
            Sign out
          </button>
        </div>
      </Card>
    </GradientShell>
  );
};

export default VerifyAccountScreen;
