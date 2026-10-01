import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import GradientShell from '@/components/GradientShell';
import { PRIVACY_VERSION, TERMS_VERSION } from '@/lib/legal';

type AuthMode = 'signin' | 'signup' | 'forgot';

const SUBTITLES: Record<AuthMode, string> = {
  signin: 'Welcome back!',
  signup: 'Create your account',
  forgot: 'Reset your password',
};

const AuthScreen = ({
  onAuthSuccess
}: {
  onAuthSuccess: () => void;
}) => {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setError('');
    setNotice('');
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'signup' && !agreedToTerms) {
      setError('Please confirm you are 18 or older and agree to the Terms & Conditions.');
      return;
    }
    setLoading(true);
    setError('');
    setNotice('');
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

      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            // Record which Terms and Privacy Policy the user agreed to, and when, on the auth user.
            data: {
              terms_version: TERMS_VERSION,
              privacy_version: PRIVACY_VERSION,
              terms_accepted_at: new Date().toISOString()
            }
          }
        });
        if (error) throw error;
      }
      onAuthSuccess();
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const submitLabel = mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Sign Up' : 'Send reset link';

  return <GradientShell centered>
      <Card className="w-full max-w-md p-6 bg-white/80 backdrop-blur-sm shadow-xl">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <img src="/lovable-uploads/c28200aa-e002-4654-86ab-fcb6351cb739.png" alt="LovKey Logo" className="w-16 h-16" />
          </div>
          <h1 className="font-bold text-primary text-3xl font-sans">LovKey</h1>
          <p className="text-sm text-muted-foreground mt-2">{SUBTITLES[mode]}</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {mode === 'forgot' && <p className="text-sm text-muted-foreground">
              Enter the email you signed up with and we'll send you a link to choose a new password.
            </p>}

          <div>
            <Input type="email" placeholder="Email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required className="rounded-xl" />
          </div>

          {mode !== 'forgot' && <div>
              <Input type="password" placeholder="Password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} value={password} onChange={e => setPassword(e.target.value)} required minLength={6} className="rounded-xl" />
            </div>}

          {mode === 'signin' && <div className="text-right -mt-2">
              <button type="button" onClick={() => switchMode('forgot')} className="text-xs text-primary hover:text-primary/80 transition-colors">
                Forgot password?
              </button>
            </div>}

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

          {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-xl">
              {error}
            </div>}

          {notice && <div className="text-sm text-foreground bg-accent p-3 rounded-xl">
              {notice}
            </div>}

          <Button type="submit" disabled={loading} className="w-full py-3 rounded-xl transition-all duration-200">
            {loading ? 'Loading...' : submitLabel}
          </Button>
        </form>

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
