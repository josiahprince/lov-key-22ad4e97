import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '../supabase';
import { errorMessage } from '../errors';
import { ago } from '../format';

const UsersPage = () => {
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const [input, setInput] = useState(query);

  const { data, error, isFetching } = useQuery({
    queryKey: ['find-users', query],
    enabled: query.trim().length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_find_users', { p_query: query });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Users</h1>
        <p className="text-sm text-muted-foreground">Search by nickname, email, phone number (at least 4 digits) or account ID.</p>
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setParams(input.trim() ? { q: input.trim() } : {});
        }}
      >
        <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="e.g. Lara, @gmail.com, 4821" />
        <Button type="submit"><Search className="h-4 w-4 mr-1" /> Search</Button>
      </form>

      {error && <p className="text-sm text-destructive">{errorMessage(error)}</p>}
      {isFetching && <p className="text-sm text-muted-foreground">Searching…</p>}
      {data && data.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">No one matches “{query}”.</p>}

      <div className="space-y-2">
        {data?.map((u) => (
          <Link key={u.id} to={`/users/${u.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 bg-card border rounded-xl p-4 hover:border-primary">
            <span className="font-medium">{u.nickname ?? 'No profile yet'}</span>
            {u.restricted && <Badge variant="destructive">Suspended or banned</Badge>}
            {!u.profile_complete && <Badge variant="outline">Profile not finished</Badge>}
            <span className="text-sm text-muted-foreground">
              {[u.city, u.country].filter(Boolean).join(', ') || 'No location'}
            </span>
            <span className="text-sm text-muted-foreground">{u.email_masked ?? 'no email'} · {u.phone_masked ?? 'no phone'}</span>
            <span className="text-sm text-muted-foreground ml-auto">Joined {ago(u.created_at)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default UsersPage;
