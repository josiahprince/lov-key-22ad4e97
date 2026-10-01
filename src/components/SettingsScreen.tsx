import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, HelpCircle, LifeBuoy, Lock, LogOut, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ScreenHeader from '@/components/ScreenHeader';
import ProfileFilters from '@/components/profile/ProfileFilters';
import BlockedUsersSection from '@/components/profile/BlockedUsersSection';
import ChangePasswordDialog from '@/components/settings/ChangePasswordDialog';
import DeleteAccountDialog from '@/components/settings/DeleteAccountDialog';
import DownloadDataButton from '@/components/settings/DownloadDataButton';
import SafetyTipsSheet from '@/components/settings/SafetyTipsSheet';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { SUPPORT_EMAIL } from '@/lib/legal';
import type { ProfileLike } from '@/types/domain';

const SettingsGroup = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="space-y-3">
    <h3 className="text-sm font-semibold text-foreground/80 uppercase tracking-wide">{title}</h3>
    {children}
  </section>
);

const SettingsScreen = ({ userProfile }: { userProfile: ProfileLike | null }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="p-4 pb-24 space-y-6">
      <ScreenHeader onBack={() => navigate('/profile')} backLabel="Back to Profile" title="Settings" />

      <SettingsGroup title="Account">
        <div className="rounded-md border px-3 py-2">
          <p className="text-xs text-muted-foreground">Signed in as</p>
          <p className="text-sm font-medium truncate">{user?.email}</p>
        </div>
        <ChangePasswordDialog />
      </SettingsGroup>

      <SettingsGroup title="Discovery">
        <ProfileFilters
          userProfile={userProfile}
          trigger={
            <Button variant="outline" className="w-full justify-start gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Match preferences
            </Button>
          }
        />
      </SettingsGroup>

      <SettingsGroup title="Privacy & Safety">
        <BlockedUsersSection />
        <SafetyTipsSheet />
        <DownloadDataButton />
      </SettingsGroup>

      <SettingsGroup title="Help & Legal">
        <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate('/terms#how-it-works')}>
          <HelpCircle className="h-4 w-4" />
          How LovKey works
        </Button>
        <Button variant="outline" className="w-full justify-start gap-2" asChild>
          <a href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('LovKey support')}`}>
            <LifeBuoy className="h-4 w-4" />
            Contact support
          </a>
        </Button>
        <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate('/terms')}>
          <FileText className="h-4 w-4" />
          Terms & Conditions
        </Button>
        <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate('/privacy')}>
          <Lock className="h-4 w-4" />
          Privacy Policy
        </Button>
      </SettingsGroup>

      <div className="space-y-3 pt-2">
        <Button variant="outline" className="w-full justify-start gap-2" onClick={() => supabase.auth.signOut()}>
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
        <DeleteAccountDialog />
      </div>
    </div>
  );
};

export default SettingsScreen;
