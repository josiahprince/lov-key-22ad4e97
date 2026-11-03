import { useInfiniteQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '../supabase';
import { errorMessage } from '../errors';
import { formatDateTime, shortId } from '../format';
import { ROLE_LABELS } from '../useStaff';

const PAGE = 100;

const ACTION_LABELS: Record<string, string> = {
  'role.granted': 'Gave a staff role',
  'role.changed': 'Changed a staff role',
  'role.revoked': 'Removed a staff role',
  'report.resolved': 'Closed a report',
  'report.messages_viewed': 'Read reported messages',
  'user.contact_revealed': 'Showed full email and phone',
  'user.warned': 'Warned',
  'user.suspended': 'Suspended',
  'user.banned': 'Banned',
  'user.restriction_lifted': 'Lifted a suspension or ban',
};

// Read-only by design: nobody can change or delete these entries.
const AuditPage = () => {
  const { data, error, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['audit'],
    initialPageParam: null as number | null,
    queryFn: async ({ pageParam }) => {
      const { data, error } = await supabase.rpc('admin_list_audit', { p_limit: PAGE, p_before: pageParam });
      if (error) throw error;
      return data;
    },
    getNextPageParam: (last) => (last.length === PAGE ? last[last.length - 1].id : undefined),
  });

  const rows = data?.pages.flat() ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Audit log</h1>
        <p className="text-sm text-muted-foreground">Everything staff have done, newest first. Entries can't be edited or deleted.</p>
      </div>

      {error && <p className="text-sm text-destructive">{errorMessage(error)}</p>}
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {data && rows.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">Nothing logged yet.</p>}

      <div className="bg-card border rounded-xl divide-y">
        {rows.map((row) => (
          <div key={row.id} className="p-4 text-sm space-y-1">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-medium">{ACTION_LABELS[row.action] ?? row.action}</span>
              {row.target_user_id && (
                <Link to={`/users/${row.target_user_id}`} className="text-primary hover:underline">
                  {row.target_nickname ?? shortId(row.target_user_id)}
                </Link>
              )}
              <span className="ml-auto text-xs text-muted-foreground">{formatDateTime(row.created_at)}</span>
            </div>
            <p className="text-muted-foreground">
              by {row.actor_email ?? 'the database (SQL editor or server)'}
              {row.actor_role && ` · ${ROLE_LABELS[row.actor_role]}`}
            </p>
            <p className="whitespace-pre-wrap">{row.reason}</p>
            {row.details && (
              <p className="text-xs text-muted-foreground font-mono break-all">{JSON.stringify(row.details)}</p>
            )}
          </div>
        ))}
      </div>

      {hasNextPage && (
        <Button variant="outline" onClick={() => void fetchNextPage()} disabled={isFetchingNextPage}>
          {isFetchingNextPage ? 'Loading…' : 'Load older entries'}
        </Button>
      )}
    </div>
  );
};

export default AuditPage;
