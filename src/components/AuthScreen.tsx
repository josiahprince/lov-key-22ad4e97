import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import GradientShell from '@/components/GradientShell';
const AuthScreen = ({
  onAuthSuccess
}: {
  onAuthSuccess: () => void;
}) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isLogin) {
        const {
          error
        } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
      } else {
        const redirectUrl = `${window.location.origin}/`;
        const {
          error
        } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl
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
  return <GradientShell centered>
      <Card className="w-full max-w-md p-6 bg-white/80 backdrop-blur-sm shadow-xl">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <img src="/lovable-uploads/c28200aa-e002-4654-86ab-fcb6351cb739.png" alt="LovKey Logo" className="w-16 h-16" />
          </div>
          <h1 className="font-bold text-primary text-3xl font-sans">LovKey</h1>
          <p className="text-sm text-muted-foreground mt-2">
            {isLogin ? 'Welcome back!' : 'Create your account'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className="rounded-xl" />
          </div>

          <div>
            <Input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} className="rounded-xl" />
          </div>

          {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-xl">
              {error}
            </div>}

          <Button type="submit" disabled={loading} className="w-full py-3 rounded-xl transition-all duration-200">
            {loading ? 'Loading...' : isLogin ? 'Sign In' : 'Sign Up'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button onClick={() => setIsLogin(!isLogin)} className="text-sm text-primary hover:text-primary/80 transition-colors">
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </Card>
    </GradientShell>;
};
export default AuthScreen;
