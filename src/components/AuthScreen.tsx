
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Heart } from 'lucide-react';

const AuthScreen = ({ onAuthSuccess }: { onAuthSuccess: () => void }) => {
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
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const redirectUrl = `${window.location.origin}/`;
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl
          }
        });
        if (error) throw error;
      }
      onAuthSuccess();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-orange-50 to-pink-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 bg-white/80 backdrop-blur-sm shadow-xl">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <Heart className="w-12 h-12 text-rose-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Heartconnect</h1>
          <p className="text-sm text-gray-600 mt-2">
            {isLogin ? 'Welcome back!' : 'Create your account'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="rounded-xl border-gray-200 focus:border-rose-300 focus:ring-rose-200"
            />
          </div>
          
          <div>
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="rounded-xl border-gray-200 focus:border-rose-300 focus:ring-rose-200"
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-xl">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-rose-500 hover:bg-rose-600 text-white py-3 rounded-xl transition-all duration-200"
          >
            {loading ? 'Loading...' : (isLogin ? 'Sign In' : 'Sign Up')}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-rose-600 hover:text-rose-700 transition-colors"
          >
            {isLogin 
              ? "Don't have an account? Sign up" 
              : "Already have an account? Sign in"
            }
          </button>
        </div>
      </Card>
    </div>
  );
};

export default AuthScreen;
