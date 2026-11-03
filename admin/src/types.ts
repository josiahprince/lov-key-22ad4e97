// Shapes of the jsonb that admin_get_report() and admin_get_user() return
// (20261103120000_admin_moderation.sql).

export interface SnapshotMessage {
  sender_id: string;
  content: string;
  created_at: string;
}

export interface ReportDetail {
  id: string;
  reason: string;
  details: string | null;
  status: 'pending' | 'reviewed' | 'actioned' | 'dismissed';
  created_at: string;
  reviewed_at: string | null;
  match_id: string | null;
  reporter_id: string;
  reporter_nickname: string | null;
  reported_id: string;
  reported_nickname: string | null;
  messages_hidden: boolean;
  messages: SnapshotMessage[] | null;
}

export interface Restriction {
  id: string;
  kind: 'warning' | 'suspension' | 'ban';
  reason: string;
  ends_at: string | null;
  created_at: string;
  lifted_at: string | null;
  lift_reason: string | null;
  active: boolean;
}

export interface UserDetail {
  id: string;
  nickname: string | null;
  age: number | null;
  gender: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  profile_complete: boolean;
  created_at: string;
  last_sign_in_at: string | null;
  banned_until: string | null;
  email_masked: string | null;
  phone_masked: string | null;
  description: string | null;
  staff_role: string | null;
  restricted: boolean;
  open_chats: number;
  reports_filed: number;
  reports_about: { id: string; reason: string; status: string; created_at: string; reporter_nickname: string | null }[];
  restrictions: Restriction[];
}

export interface StaffPhoto {
  id: string;
  slot: number;
  isMain: boolean;
  status: 'pending' | 'approved' | 'rejected';
  reason: string | null;
  url: string | null;
}
