import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '../supabase';
import { errorMessage } from '../errors';
import { useStaff } from '../useStaff';
import { AuthCard } from '../components/AuthCard';

const SignInPage = () => {
  const { notice } = useStaff();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // On success the auth state changes and StaffProvider moves on to the role
  // check and the authenticator step.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) setError(errorMessage(error));
    setLoading(false);
  };

  return (
    <AuthCard title="Staff sign-in" subtitle="For the LovKey team only. Every action is logged.">
      <form onSubmit={handleSubmit} className="space-y-4">
        {(error || notice) && (
          <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">{error || notice}</p>
        )}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </AuthCard>
  );
};

export default SignInPage;
