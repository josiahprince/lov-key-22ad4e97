import { format, formatDistanceToNowStrict } from 'date-fns';

// Matches the reasons in submit_report() (20260828142000_create_reports_and_submit_report.sql).
export const REPORT_REASONS: Record<string, string> = {
  harassment: 'Harassment',
  inappropriate_content: 'Inappropriate content',
  fake_profile: 'Fake profile',
  spam: 'Spam',
  underage: 'Suspected under 18',
  other: 'Other',
};

export const REPORT_STATUSES = ['pending', 'reviewed', 'actioned', 'dismissed'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const STATUS_LABELS: Record<ReportStatus, string> = {
  pending: 'Open',
  reviewed: 'Reviewed',
  actioned: 'Action taken',
  dismissed: 'Dismissed',
};

// Apple expects reports to be acted on within 24 hours.
export const REPORT_DEADLINE_HOURS = 24;

export const hoursSince = (iso: string) => (Date.now() - new Date(iso).getTime()) / 3_600_000;

export const formatDateTime = (iso: string | null | undefined) => (iso ? format(new Date(iso), 'd MMM yyyy, HH:mm') : '—');

export const ago = (iso: string | null | undefined) =>
  iso ? `${formatDistanceToNowStrict(new Date(iso))} ago` : '—';

export const shortId = (id: string | null | undefined) => (id ? id.slice(0, 8) : '—');
