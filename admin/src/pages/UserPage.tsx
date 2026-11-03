import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import { adminAction, supabase } from '../supabase';
import { errorMessage } from '../errors';
import { ago, formatDateTime, REPORT_REASONS, STATUS_LABELS, type ReportStatus } from '../format';
import type { Restriction, StaffPhoto, UserDetail } from '../types';
import { useStaff } from '../useStaff';
import { ReasonDialog } from '../components/ReasonDialog';
import { UserActions } from '../components/UserActions';

const KIND_LABELS: Record<Restriction['kind'], string> = {
  warning: 'Warning',
  suspension: 'Suspension',
  ban: 'Ban',
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-card border rounded-xl p-4 space-y-3">
    <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
    {children}
  </div>
);

const UserPage = () => {
  const { userId = '' } = useParams();
  const { can } = useStaff();
  const queryClient = useQueryClient();
  const [revealOpen, setRevealOpen] = useState(false);
  const [contact, setContact] = useState<{ email: string | null; phone: string | null } | null>(null);
  const [lifting, setLifting] = useState<Restriction | null>(null);

  const { data: user, error, isLoading } = useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_user', { p_user_id: userId });
      if (error) throw error;
      return data as unknown as UserDetail;
    },
  });

  const { data: photos } = useQuery({
    queryKey: ['user-photos', userId],
    queryFn: async () => (await adminAction<{ photos: StaffPhoto[] }>({ action: 'photo_urls', userId })).photos,
  });

  const nickname = user?.nickname ?? 'This person';

  return (
    <div className="space-y-6">
      <Link to="/users" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4 mr-1" /> Users
      </Link>

      {error && <p className="text-sm text-destructive">{errorMessage(error)}</p>}
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {user && (
        <>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold">{user.nickname ?? 'No profile yet'}</h1>
              {user.restricted && <Badge variant="destructive">Suspended or banned</Badge>}
              {user.staff_role && <Badge>Staff</Badge>}
              {!user.profile_complete && <Badge variant="outline">Profile not finished</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">
              {[user.age && `${user.age}`, user.gender, [user.city, user.country].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}
            </p>
            <p className="text-xs text-muted-foreground font-mono">{user.id}</p>
          </div>

          <UserActions userId={user.id} nickname={nickname} isStaff={!!user.staff_role} />

          <div className="grid gap-4 md:grid-cols-2">
            <Section title="Account">
              <dl className="text-sm grid grid-cols-[auto,1fr] gap-x-4 gap-y-1">
                <dt className="text-muted-foreground">Joined</dt><dd>{formatDateTime(user.created_at)}</dd>
                <dt className="text-muted-foreground">Last sign-in</dt><dd>{user.last_sign_in_at ? ago(user.last_sign_in_at) : 'Never'}</dd>
                <dt className="text-muted-foreground">Email</dt><dd>{contact ? contact.email ?? '—' : user.email_masked ?? '—'}</dd>
                <dt className="text-muted-foreground">Phone</dt><dd>{contact ? contact.phone ?? '—' : user.phone_masked ?? '—'}</dd>
                <dt className="text-muted-foreground">Open chats</dt><dd>{user.open_chats}</dd>
                <dt className="text-muted-foreground">Reports filed</dt><dd>{user.reports_filed}</dd>
                {user.banned_until && new Date(user.banned_until) > new Date() && (
                  <><dt className="text-muted-foreground">Sign-in blocked until</dt><dd>{formatDateTime(user.banned_until)}</dd></>
                )}
              </dl>
              {can('users.view_contact') && !contact && (
                <Button variant="outline" size="sm" onClick={() => setRevealOpen(true)}>
                  <Eye className="h-4 w-4 mr-1" /> Show full email and phone
                </Button>
              )}
            </Section>

            <Section title="About them">
              <p className="text-sm whitespace-pre-wrap">{user.description || 'Nothing written.'}</p>
            </Section>
          </div>

          <Section title="Photos">
            {!photos && <p className="text-sm text-muted-foreground">Loading photos…</p>}
            {photos && photos.length === 0 && <p className="text-sm text-muted-foreground">No photos.</p>}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {photos?.map((p) => (
                <div key={p.id} className="space-y-1">
                  <div className={cn('aspect-[3/4] rounded-lg bg-muted overflow-hidden border-2', p.status === 'rejected' ? 'border-destructive' : p.status === 'pending' ? 'border-amber-400' : 'border-transparent')}>
                    {p.url && <img src={p.url} alt={`Photo ${p.slot}`} className="h-full w-full object-cover" />}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {p.isMain ? 'Main · ' : ''}{p.status === 'approved' ? 'Approved' : p.status === 'pending' ? 'Not checked yet' : 'Rejected'}
                  </p>
                  {p.reason && <p className="text-xs text-destructive">{p.reason}</p>}
                </div>
              ))}
            </div>
          </Section>

          <Section title="Warnings, suspensions and bans">
            {user.restrictions.length === 0 && <p className="text-sm text-muted-foreground">None.</p>}
            {user.restrictions.map((r) => (
              <div key={r.id} className="flex flex-wrap items-start gap-2 border-t first:border-t-0 pt-3 first:pt-0">
                <Badge variant={r.active ? 'destructive' : 'secondary'}>{KIND_LABELS[r.kind]}</Badge>
                <div className="flex-1 min-w-[12rem] text-sm">
                  <p className="whitespace-pre-wrap">{r.reason}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDateTime(r.created_at)}
                    {r.kind === 'suspension' && ` · until ${formatDateTime(r.ends_at)}`}
                    {r.lifted_at && ` · lifted ${formatDateTime(r.lifted_at)}: ${r.lift_reason}`}
                    {!r.active && !r.lifted_at && r.kind === 'suspension' && ' · ended'}
                  </p>
                </div>
                {r.active && can(r.kind === 'ban' ? 'users.ban' : 'users.suspend') && (
                  <Button variant="outline" size="sm" onClick={() => setLifting(r)}>Lift</Button>
                )}
              </div>
            ))}
          </Section>

          <Section title="Reports about them">
            {user.reports_about.length === 0 && <p className="text-sm text-muted-foreground">None.</p>}
            {user.reports_about.map((r) => (
              <Link key={r.id} to={`/reports/${r.id}`} className="flex flex-wrap items-center gap-2 text-sm hover:underline">
                <Badge variant="secondary">{REPORT_REASONS[r.reason] ?? r.reason}</Badge>
                <span>{STATUS_LABELS[r.status as ReportStatus] ?? r.status}</span>
                <span className="text-muted-foreground">by {r.reporter_nickname ?? 'a deleted account'} · {ago(r.created_at)}</span>
              </Link>
            ))}
          </Section>

          <ReasonDialog
            open={revealOpen}
            onOpenChange={setRevealOpen}
            title="Show full email and phone"
            description="This is logged with your reason. Only do it when you need to contact them or answer a legal request."
            confirmLabel="Show"
            onConfirm={async (reason) => {
              const { data, error } = await supabase.rpc('admin_reveal_contact', { p_user_id: user.id, p_reason: reason });
              if (error) throw error;
              setContact(data[0] ?? { email: null, phone: null });
            }}
          />
          <ReasonDialog
            open={lifting !== null}
            onOpenChange={(open) => !open && setLifting(null)}
            title={`Lift this ${lifting ? KIND_LABELS[lifting.kind].toLowerCase() : ''}`}
            description="They can sign in and be matched again once nothing else is in force. Chats that were closed stay closed."
            confirmLabel="Lift"
            onConfirm={async (reason) => {
              await adminAction({ action: 'lift', restrictionId: lifting!.id, reason });
              toast.success('Lifted');
              void queryClient.invalidateQueries();
            }}
          />
        </>
      )}
    </div>
  );
};

export default UserPage;
