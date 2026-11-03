import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { supabase } from '../supabase';
import { errorMessage } from '../errors';
import {
  ago, hoursSince, REPORT_DEADLINE_HOURS, REPORT_REASONS, REPORT_STATUSES, STATUS_LABELS, type ReportStatus,
} from '../format';

const ReportsPage = () => {
  const [params, setParams] = useSearchParams();
  const status = (REPORT_STATUSES as readonly string[]).includes(params.get('status') ?? '')
    ? (params.get('status') as ReportStatus)
    : 'pending';

  const { data, error, isLoading } = useQuery({
    queryKey: ['reports', status],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_list_reports', { p_status: status });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="text-sm text-muted-foreground">Open reports are oldest first, so the next one due is at the top.</p>
      </div>

      <div className="flex gap-1 border-b overflow-x-auto">
        {REPORT_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setParams(s === 'pending' ? {} : { status: s })}
            className={cn(
              'px-3 py-2 text-sm border-b-2 -mb-px whitespace-nowrap',
              s === status ? 'border-primary text-primary font-medium' : 'border-transparent text-muted-foreground',
            )}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-destructive">{errorMessage(error)}</p>}
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {data && data.length === 0 && (
        <p className="text-sm text-muted-foreground py-8 text-center">
          {status === 'pending' ? 'No open reports. Nice.' : 'Nothing here yet.'}
        </p>
      )}

      <div className="space-y-2">
        {data?.map((r) => {
          const overdue = status === 'pending' && hoursSince(r.created_at) >= REPORT_DEADLINE_HOURS;
          return (
            <Link
              key={r.id}
              to={`/reports/${r.id}`}
              className={cn('block bg-card border rounded-xl p-4 hover:border-primary', overdue && 'border-destructive')}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={r.reason === 'underage' ? 'destructive' : 'secondary'}>
                  {REPORT_REASONS[r.reason] ?? r.reason}
                </Badge>
                <span className="font-medium">{r.reported_nickname ?? 'Deleted account'}</span>
                <span className="text-sm text-muted-foreground">reported by {r.reporter_nickname ?? 'a deleted account'}</span>
                {r.has_messages && <MessageSquare className="h-4 w-4 text-muted-foreground" aria-label="Messages attached" />}
                {r.reported_open_reports > 1 && (
                  <Badge variant="outline">{r.reported_open_reports} open reports on this person</Badge>
                )}
                <span className={cn('ml-auto text-sm', overdue ? 'text-destructive font-medium' : 'text-muted-foreground')}>
                  {overdue ? `Overdue · ${ago(r.created_at)}` : ago(r.created_at)}
                </span>
              </div>
              {r.details && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{r.details}</p>}
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default ReportsPage;
