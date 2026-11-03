import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import { supabase } from '../supabase';
import { errorMessage } from '../errors';
import { formatDateTime, REPORT_REASONS, STATUS_LABELS } from '../format';
import type { ReportDetail } from '../types';
import { useStaff } from '../useStaff';
import { ReasonDialog } from '../components/ReasonDialog';
import { UserActions } from '../components/UserActions';

type Outcome = 'actioned' | 'dismissed' | 'reviewed';

const OUTCOMES: { status: Outcome; label: string; description: string }[] = [
  { status: 'actioned', label: 'Action taken', description: 'You warned, suspended or banned someone because of this report.' },
  { status: 'dismissed', label: 'Dismiss', description: "The report doesn't break the rules, or can't be confirmed." },
  { status: 'reviewed', label: 'Reviewed, no action', description: 'You looked into it and there is nothing to do for now.' },
];

const ReportPage = () => {
  const { reportId = '' } = useParams();
  const { can } = useStaff();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const { data: report, error, isLoading } = useQuery({
    queryKey: ['report', reportId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_report', { p_report_id: reportId });
      if (error) throw error;
      return data as unknown as ReportDetail;
    },
  });

  // Whether the reported person is staff decides if the action buttons show.
  const { data: reportedRole } = useQuery({
    queryKey: ['user-role', report?.reported_id],
    enabled: !!report && can('users.view'),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_user', { p_user_id: report!.reported_id });
      if (error) return null;
      return (data as unknown as { staff_role: string | null }).staff_role;
    },
  });

  const nameFor = (senderId: string) =>
    senderId === report?.reported_id ? report.reported_nickname ?? 'Reported person'
      : senderId === report?.reporter_id ? report.reporter_nickname ?? 'Reporter'
      : 'Unknown';

  return (
    <div className="space-y-6">
      <Link to="/reports" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4 mr-1" /> Reports
      </Link>

      {error && <p className="text-sm text-destructive">{errorMessage(error)}</p>}
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {report && (
        <>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold">{REPORT_REASONS[report.reason] ?? report.reason}</h1>
              <Badge variant={report.status === 'pending' ? 'default' : 'secondary'}>{STATUS_LABELS[report.status]}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Filed {formatDateTime(report.created_at)}
              {report.reviewed_at && ` · closed ${formatDateTime(report.reviewed_at)}`}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="bg-card border rounded-xl p-4 space-y-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Reported</p>
              {report.reported_nickname
                ? <Link to={`/users/${report.reported_id}`} className="font-medium text-primary hover:underline">{report.reported_nickname}</Link>
                : <p className="font-medium">Deleted account</p>}
              <div className="pt-3">
                {report.reported_nickname && (
                  <UserActions userId={report.reported_id} nickname={report.reported_nickname} isStaff={!!reportedRole} />
                )}
              </div>
            </div>
            <div className="bg-card border rounded-xl p-4 space-y-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Reported by</p>
              {report.reporter_nickname
                ? <Link to={`/users/${report.reporter_id}`} className="font-medium text-primary hover:underline">{report.reporter_nickname}</Link>
                : <p className="font-medium">Deleted account</p>}
              <p className="text-sm text-muted-foreground pt-2">The reported person is never told who reported them.</p>
            </div>
          </div>

          <div className="bg-card border rounded-xl p-4 space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">What they wrote</p>
            <p className="text-sm whitespace-pre-wrap">{report.details || 'No details given.'}</p>
          </div>

          <div className="bg-card border rounded-xl p-4 space-y-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Chat messages at the time of the report
            </p>
            {report.messages_hidden && (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Lock className="h-4 w-4" /> Messages are attached, but your role can't read them.
              </p>
            )}
            {!report.messages_hidden && !report.messages?.length && (
              <p className="text-sm text-muted-foreground">No messages attached (reported from a profile, or the chat was empty).</p>
            )}
            {report.messages && report.messages.length > 0 && (
              <div className="space-y-2 max-h-[28rem] overflow-y-auto">
                {/* Stored newest first; shown oldest first like a chat. */}
                {[...report.messages].reverse().map((m, i) => {
                  const fromReported = m.sender_id === report.reported_id;
                  return (
                    <div key={i} className={cn('rounded-lg p-3 text-sm max-w-[85%]', fromReported ? 'bg-destructive/10' : 'bg-muted ml-auto')}>
                      <p className="text-xs text-muted-foreground mb-1">
                        {nameFor(m.sender_id)} · {formatDateTime(m.created_at)}
                      </p>
                      <p className="whitespace-pre-wrap break-words">{m.content}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {can('reports.resolve') && (
            <div className="bg-card border rounded-xl p-4 space-y-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Close this report</p>
              <div className="flex flex-wrap gap-2">
                {OUTCOMES.map((o) => (
                  <Button
                    key={o.status}
                    variant={o.status === 'actioned' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setOutcome(o.status)}
                  >
                    {o.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <ReasonDialog
            open={outcome !== null}
            onOpenChange={(open) => !open && setOutcome(null)}
            title={OUTCOMES.find((o) => o.status === outcome)?.label ?? ''}
            description={OUTCOMES.find((o) => o.status === outcome)?.description ?? ''}
            reasonLabel="What you decided and why (goes in the audit log)"
            confirmLabel="Close report"
            onConfirm={async (reason) => {
              const { error } = await supabase.rpc('admin_resolve_report', {
                p_report_id: report.id,
                p_status: outcome!,
                p_reason: reason,
              });
              if (error) throw error;
              toast.success('Report closed');
              void queryClient.invalidateQueries();
              navigate('/reports');
            }}
          />
        </>
      )}
    </div>
  );
};

export default ReportPage;
