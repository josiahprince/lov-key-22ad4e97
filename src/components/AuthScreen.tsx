import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { CountryCode } from 'libphonenumber-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import GradientShell from '@/components/GradientShell';
import CodeStep from '@/components/auth/CodeStep';
import PhoneNumberInput from '@/components/auth/PhoneNumberInput';
import { defaultPhoneCountry, formatPhone, toE164 } from '@/lib/phone';
import { PRIVACY_VERSION, TERMS_VERSION } from '@/lib/legal';
import { authErrorMessage } from '@/lib/authErrors';
import { cn } from '@/lib/utils';

type AuthMode = 'signin' | 'signup' | 'forgot';
type SignInMethod = 'phone' | 'email';

const SUBTITLES: Record<AuthMode, string> = {
  signin: 'Welcome back!',
  signup: 'Create your account',
  forgot: 'Reset your password',
};

// Record which Terms and Privacy Policy the user agreed to, and when, on the auth user.
const termsMetadata = () => ({
  terms_version: TERMS_VERSION,
  privacy_version: PRIVACY_VERSION,
  terms_accepted_at: new Date().toISOString(),
});

// Sign-up is phone first, like Hinge: an SMS code creates the account, then
// AppLayout shows VerifyAccountScreen to add and confirm an email and password.
// Sign-in works with either the phone (SMS code) or the email and password.
const AuthScreen = () => {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [method, setMethod] = useState<SignInMethod>('phone');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [country, setCountry] = useState<CountryCode>(defaultPhoneCountry);
  const [phoneInput, setPhoneInput] = useState('');
  // The E.164 number a code was just texted to; shows the code step.
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const clearMessages = () => {
    setError('');
    setNotice('');
  };

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setCodeSentTo(null);
    clearMessages();
  };

  const switchMethod = (next: SignInMethod) => {
    setMethod(next);
    clearMessages();
  };

  const usesPhone = mode === 'signup' || (mode === 'signin' && method === 'phone');

  // Sign-in never creates an account, so a mistyped number gets "no account"
  // instead of a fresh, empty one.
  const sendPhoneCode = async (phone: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      phone,
      options: mode === 'signup'
        ? { shouldCreateUser: true, data: termsMetadata() }
        : { shouldCreateUser: false },
    });
    if (error) throw error;
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'signup' && !agreedToTerms) {
      setError('Please confirm you are 18 or older and agree to the Terms & Conditions.');
      return;
    }
    const phone = toE164(country, phoneInput);
    if (!phone) {
      setError("That doesn't look like a valid mobile number. Check the country code and the number.");
      return;
    }
    setLoading(true);
    clearMessages();
    try {
      await sendPhoneCode(phone);
      setCodeSentTo(phone);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // On success the auth state changes and AppLayout replaces this screen.
  const verifyPhoneCode = async (code: string) => {
    if (!codeSentTo) return;
    const { error } = await supabase.auth.verifyOtp({ phone: codeSentTo, token: code, type: 'sms' });
    if (error) throw error;
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearMessages();
    try {
      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/reset-password`
        });
        if (error) throw error;
        // Same message whether or not the address has an account, so the
        // form can't be used to find out who is on LovKey.
        setNotice('If an account exists for that email, we have sent a link to reset your password. Check your inbox and spam folder.');
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const messages = <>
      {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-xl">
          {error}
        </div>}
      {notice && <div className="text-sm text-foreground bg-accent p-3 rounded-xl">
          {notice}
        </div>}
    </>;

  return <GradientShell centered>
      <Card className="w-full max-w-md p-6 bg-card/80 backdrop-blur-sm shadow-xl">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <img src="/lovable-uploads/c28200aa-e002-4654-86ab-fcb6351cb739.png" alt="LovKey Logo" className="w-16 h-16" />
          </div>
          <h1 className="font-bold text-primary text-3xl font-sans">LovKey</h1>
          <p className="text-sm text-muted-foreground mt-2">{SUBTITLES[mode]}</p>
        </div>

        {mode === 'signin' && !codeSentTo && <div role="tablist" aria-label="Sign in with" className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1 mb-4">
            {(['phone', 'email'] as const).map(option => <button key={option} type="button" role="tab" aria-selected={method === option} onClick={() => switchMethod(option)} className={cn('rounded-lg py-2 text-sm font-medium transition-colors', method === option ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                {option === 'phone' ? 'Phone' : 'Email'}
              </button>)}
          </div>}

        {codeSentTo ? <CodeStep channel="sms" sentTo={formatPhone(codeSentTo)} onVerify={verifyPhoneCode} onResend={() => sendPhoneCode(codeSentTo)} onChangeDestination={() => {
          setCodeSentTo(null);
          clearMessages();
        }} changeLabel="Change number" /> : usesPhone ? <form onSubmit={handlePhoneSubmit} className="space-y-4">
            {mode === 'signup' && <p className="text-sm text-muted-foreground">
                Start with your mobile number. We'll text you a code, then ask for your email.
              </p>}

            <PhoneNumberInput country={country} onCountryChange={setCountry} number={phoneInput} onNumberChange={setPhoneInput} disabled={loading} />

            {mode === 'signup' && <div className="flex items-start gap-2">
                <Checkbox id="agree-terms" checked={agreedToTerms} onCheckedChange={checked => setAgreedToTerms(checked === true)} className="mt-0.5" />
                <label htmlFor="agree-terms" className="text-sm text-muted-foreground leading-snug">
                  I am 18 or older and agree to the{' '}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                    Terms &amp; Conditions
                  </a>
                  {' '}and have read the{' '}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                    Privacy Policy
                  </a>
                </label>
              </div>}

            {messages}

            <Button type="submit" disabled={loading} className="w-full py-3 rounded-xl transition-all duration-200">
              {loading ? 'Sending...' : 'Send code'}
            </Button>
          </form> : <form onSubmit={handleEmailSubmit} className="space-y-4">
            {mode === 'forgot' && <p className="text-sm text-muted-foreground">
                Enter the email you signed up with and we'll send you a link to choose a new password.
              </p>}

            <div>
              <Input type="email" placeholder="Email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required className="rounded-xl" />
            </div>

            {mode === 'signin' && <>
                <div>
                  <Input type="password" placeholder="Password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} className="rounded-xl" />
                </div>
                <div className="text-right -mt-2">
                  <button type="button" onClick={() => switchMode('forgot')} className="text-xs text-primary hover:text-primary/80 transition-colors">
                    Forgot password?
                  </button>
                </div>
              </>}

            {messages}

            <Button type="submit" disabled={loading} className="w-full py-3 rounded-xl transition-all duration-200">
              {loading ? 'Loading...' : mode === 'signin' ? 'Sign In' : 'Send reset link'}
            </Button>
          </form>}

        <div className="mt-6 text-center">
          {mode === 'forgot' ? <button onClick={() => switchMode('signin')} className="text-sm text-primary hover:text-primary/80 transition-colors">
              Back to sign in
            </button> : <button onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')} className="text-sm text-primary hover:text-primary/80 transition-colors">
              {mode === 'signin' ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>}
          <div className="mt-3 flex justify-center gap-3 text-xs text-muted-foreground">
            <Link to="/terms" className="hover:underline">Terms &amp; Conditions</Link>
            <span aria-hidden>·</span>
            <Link to="/privacy" className="hover:underline">Privacy Policy</Link>
          </div>
        </div>
      </Card>
    </GradientShell>;
};
export default AuthScreen;
