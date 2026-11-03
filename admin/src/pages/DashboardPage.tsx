import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { supabase } from '../supabase';
import { errorMessage } from '../errors';
import { ago, hoursSince, REPORT_DEADLINE_HOURS } from '../format';

const Stat = ({ label, value, hint, alert, to }: { label: string; value: string; hint?: string; alert?: boolean; to?: string }) => {
  const body = (
    <div className={cn('bg-card border rounded-xl p-4 h-full', alert && 'border-destructive bg-destructive/5', to && 'hover:border-primary')}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn('text-3xl font-semibold mt-1', alert && 'text-destructive')}>{value}</p>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
  return to ? <Link to={to}>{body}</Link> : body;
};

const DashboardPage = () => {
  const { data, error, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_dashboard_stats');
      if (error) throw error;
      return data[0];
    },
    refetchInterval: 60_000,
  });

  const oldestHours = data?.oldest_open_report_at ? hoursSince(data.oldest_open_report_at) : 0;
  const overdue = oldestHours >= REPORT_DEADLINE_HOURS;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Clear open reports within {REPORT_DEADLINE_HOURS} hours. Check twice a day.</p>
      </div>
      {error && <p className="text-sm text-destructive">{errorMessage(error)}</p>}
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {data && (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Stat label="Open reports" value={String(data.open_reports)} to="/reports" alert={overdue} />
          <Stat
            label="Oldest open report"
            value={data.oldest_open_report_at ? `${Math.floor(oldestHours)}h` : '—'}
            hint={data.oldest_open_report_at
              ? overdue ? `Past the ${REPORT_DEADLINE_HOURS}-hour deadline` : `Filed ${ago(data.oldest_open_report_at)}`
              : 'Nothing waiting'}
            alert={overdue}
          />
          <Stat label="Bans this week" value={String(data.bans_this_week)} />
          <Stat label="Active suspensions" value={String(data.suspensions_active)} />
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
