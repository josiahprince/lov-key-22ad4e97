
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Heart, Eye, EyeOff } from 'lucide-react';

const AuthScreen = ({ onAuthSuccess }: { onAuthSuccess: () => void }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (isForgotPassword) {
        const redirectUrl = `${window.location.origin}/reset-password`;
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: redirectUrl
        });
        if (error) throw error;
        setMessage('Password reset email sent! Check your inbox.');
      } else if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        onAuthSuccess();
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
        onAuthSuccess();
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setError('');
    setMessage('');
    setEmail('');
    setPassword('');
  };

  const handleModeChange = (newMode: 'login' | 'signup' | 'forgot') => {
    resetForm();
    if (newMode === 'forgot') {
      setIsForgotPassword(true);
      setIsLogin(true);
    } else {
      setIsForgotPassword(false);
      setIsLogin(newMode === 'login');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-400 via-rose-400 to-red-500 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-br from-white/10 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-white/10 to-transparent rounded-full blur-3xl"></div>
      </div>

      <Card className="w-full max-w-sm relative z-10 bg-white/95 backdrop-blur-xl shadow-2xl border-0 rounded-3xl overflow-hidden">
        <div className="p-8">
          {/* Logo and branding */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full flex items-center justify-center shadow-lg">
                <Heart className="w-8 h-8 text-white fill-current" />
              </div>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent mb-2">
              Heartconnect
            </h1>
            <p className="text-gray-600 text-sm">
              {isForgotPassword 
                ? 'Reset your password' 
                : isLogin 
                  ? 'Welcome back!' 
                  : 'Find your perfect match'
              }
            </p>
          </div>

          {/* Auth form */}
          <form onSubmit={handleAuth} className="space-y-6">
            <div className="space-y-4">
              <div>
                <Input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 rounded-2xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-pink-300 focus:ring-pink-200 transition-all duration-200 text-base"
                />
              </div>
              
              {!isForgotPassword && (
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="h-12 rounded-2xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-pink-300 focus:ring-pink-200 transition-all duration-200 text-base pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              )}
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-4 rounded-2xl border border-red-100">
                {error}
              </div>
            )}

            {message && (
              <div className="text-sm text-green-600 bg-green-50 p-4 rounded-2xl border border-green-100">
                {message}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-semibold rounded-2xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl disabled:opacity-50 disabled:transform-none"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Please wait...</span>
                </div>
              ) : (
                isForgotPassword 
                  ? 'Send Reset Email'
                  : isLogin 
                    ? 'Sign In' 
                    : 'Create Account'
              )}
            </Button>
          </form>

          {/* Navigation between modes */}
          <div className="mt-8 text-center space-y-4">
            {!isForgotPassword ? (
              <>
                <button
                  onClick={() => handleModeChange(isLogin ? 'signup' : 'login')}
                  className="text-sm font-medium text-gray-600 hover:text-pink-600 transition-colors"
                >
                  {isLogin 
                    ? "New here? Create an account" 
                    : "Already have an account? Sign in"
                  }
                </button>
                
                {isLogin && (
                  <div>
                    <button
                      onClick={() => handleModeChange('forgot')}
                      className="text-sm font-medium text-pink-600 hover:text-pink-700 transition-colors"
                    >
                      Forgot your password?
                    </button>
                  </div>
                )}
              </>
            ) : (
              <button
                onClick={() => handleModeChange('login')}
                className="text-sm font-medium text-gray-600 hover:text-pink-600 transition-colors"
              >
                Back to sign in
              </button>
            )}
          </div>

          {/* Terms text for signup */}
          {!isLogin && !isForgotPassword && (
            <p className="text-xs text-gray-500 text-center mt-6 leading-relaxed">
              By creating an account, you agree to our Terms of Service and Privacy Policy
            </p>
          )}
        </div>
      </Card>
    </div>
  );
};

export default AuthScreen;
