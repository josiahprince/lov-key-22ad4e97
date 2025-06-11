
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Heart, Eye, EyeOff, Phone, Mail } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

const countryCodes = [
  { code: '+1', country: 'US', flag: '🇺🇸' },
  { code: '+91', country: 'IN', flag: '🇮🇳' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+86', country: 'CN', flag: '🇨🇳' },
  { code: '+81', country: 'JP', flag: '🇯🇵' },
  { code: '+49', country: 'DE', flag: '🇩🇪' },
  { code: '+33', country: 'FR', flag: '🇫🇷' },
  { code: '+39', country: 'IT', flag: '🇮🇹' },
  { code: '+34', country: 'ES', flag: '🇪🇸' },
  { code: '+61', country: 'AU', flag: '🇦🇺' },
  { code: '+55', country: 'BR', flag: '🇧🇷' },
  { code: '+7', country: 'RU', flag: '🇷🇺' },
];

const AuthScreen = ({ onAuthSuccess }: { onAuthSuccess: () => void }) => {
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);
  
  // Email auth states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Phone auth states
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  
  // Common states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleEmailAuth = async (e: React.FormEvent) => {
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

  const handlePhoneAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    const fullPhoneNumber = `${countryCode}${phoneNumber}`;

    try {
      if (!isOtpSent) {
        // Send OTP
        const { error } = await supabase.auth.signInWithOtp({
          phone: fullPhoneNumber,
        });
        if (error) throw error;
        setIsOtpSent(true);
        setMessage('OTP sent to your phone! Please enter the code below.');
      } else {
        // Verify OTP
        const { error } = await supabase.auth.verifyOtp({
          phone: fullPhoneNumber,
          token: otp,
          type: 'sms'
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
    setPhoneNumber('');
    setOtp('');
    setIsOtpSent(false);
  };

  const handleModeChange = (newMode: 'login' | 'signup' | 'forgot') => {
    resetForm();
    if (newMode === 'forgot') {
      setIsForgotPassword(true);
      setIsLogin(true);
      setAuthMethod('email'); // Forgot password only works with email
    } else {
      setIsForgotPassword(false);
      setIsLogin(newMode === 'login');
    }
  };

  const handleAuthMethodChange = (method: 'email' | 'phone') => {
    resetForm();
    setAuthMethod(method);
    setIsForgotPassword(false); // Reset forgot password when switching methods
  };

  const renderEmailForm = () => (
    <form onSubmit={handleEmailAuth} className="space-y-6">
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
  );

  const renderPhoneForm = () => (
    <form onSubmit={handlePhoneAuth} className="space-y-6">
      <div className="space-y-4">
        {!isOtpSent ? (
          <div className="space-y-4">
            <div className="flex space-x-2">
              <Select value={countryCode} onValueChange={setCountryCode}>
                <SelectTrigger className="w-24 h-12 rounded-2xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-pink-300 focus:ring-pink-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {countryCodes.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      <span className="flex items-center space-x-2">
                        <span>{country.flag}</span>
                        <span>{country.code}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="tel"
                placeholder="Phone number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                required
                className="flex-1 h-12 rounded-2xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-pink-300 focus:ring-pink-200 transition-all duration-200 text-base"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-4">
                Enter the 6-digit code sent to {countryCode}{phoneNumber}
              </p>
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={setOtp}
                className="justify-center"
              >
                <InputOTPGroup>
                  {Array.from({ length: 6 }, (_, i) => (
                    <InputOTPSlot 
                      key={i} 
                      index={i} 
                      className="w-12 h-12 text-lg border-gray-200 focus:border-pink-300 focus:ring-pink-200"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOtpSent(false)}
              className="w-full text-sm text-gray-600 hover:text-pink-600"
            >
              Change phone number
            </Button>
          </div>
        )}
      </div>

      <Button
        type="submit"
        disabled={loading || (isOtpSent && otp.length !== 6)}
        className="w-full h-12 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-semibold rounded-2xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl disabled:opacity-50 disabled:transform-none"
      >
        {loading ? (
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            <span>Please wait...</span>
          </div>
        ) : (
          isOtpSent ? 'Verify OTP' : 'Send OTP'
        )}
      </Button>
    </form>
  );

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

          {/* Auth method selection */}
          {!isForgotPassword && (
            <div className="flex mb-6 bg-gray-100 rounded-2xl p-1">
              <button
                onClick={() => handleAuthMethodChange('email')}
                className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl transition-all duration-200 ${
                  authMethod === 'email'
                    ? 'bg-white shadow-md text-pink-600'
                    : 'text-gray-600 hover:text-pink-600'
                }`}
              >
                <Mail className="w-4 h-4" />
                <span className="text-sm font-medium">Email</span>
              </button>
              <button
                onClick={() => handleAuthMethodChange('phone')}
                className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl transition-all duration-200 ${
                  authMethod === 'phone'
                    ? 'bg-white shadow-md text-pink-600'
                    : 'text-gray-600 hover:text-pink-600'
                }`}
              >
                <Phone className="w-4 h-4" />
                <span className="text-sm font-medium">Phone</span>
              </button>
            </div>
          )}

          {/* Auth form */}
          {authMethod === 'email' ? renderEmailForm() : renderPhoneForm()}

          {error && (
            <div className="mt-4 text-sm text-red-600 bg-red-50 p-4 rounded-2xl border border-red-100">
              {error}
            </div>
          )}

          {message && (
            <div className="mt-4 text-sm text-green-600 bg-green-50 p-4 rounded-2xl border border-green-100">
              {message}
            </div>
          )}

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
                
                {isLogin && authMethod === 'email' && (
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
