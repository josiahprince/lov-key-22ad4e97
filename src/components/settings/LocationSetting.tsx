import { Loader2, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LocationHelp from '@/components/LocationHelp';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useDeviceLocation } from '@/hooks/useDeviceLocation';
import { LOCATION_FAILURE_MESSAGES, LOCATION_SAVE_REJECTED_MESSAGE, formatPlace, isImplausibleLocationError, saveProfileLocation } from '@/lib/location';
import { logError } from '@/lib/errorLogger';
import type { ProfileLike } from '@/types/domain';

// Shows where LovKey thinks you are, and refreshes it from the device on
// demand (it also refreshes on its own once a day). There is no manual entry.
const LocationSetting = ({
  userProfile,
  onProfileUpdated,
}: {
  userProfile: ProfileLike | null;
  onProfileUpdated?: (patch: Partial<ProfileLike>) => void;
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { locate, locating, failure } = useDeviceLocation();

  const handleUpdate = async () => {
    if (!user) return;
    const found = await locate();
    if (!found) return;
    try {
      const patch = await saveProfileLocation(user.id, found);
      onProfileUpdated?.(patch);
      toast({ title: 'Location updated', description: formatPlace(found) });
    } catch (error) {
      if (isImplausibleLocationError(error)) {
        toast({ title: "Location not updated", description: LOCATION_SAVE_REJECTED_MESSAGE, variant: 'destructive' });
        return;
      }
      logError('LocationSetting:save', error);
      toast({ title: 'Error', description: "Couldn't save your location. Please try again.", variant: 'destructive' });
    }
  };

  const place = formatPlace(userProfile);

  return (
    <div className="rounded-md border px-3 py-3 space-y-3">
      <div className="flex items-start gap-2">
        <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{place || 'No location yet'}</p>
          <p className="text-xs text-muted-foreground">Updates automatically once a day from your device.</p>
        </div>
      </div>
      {failure && (
        <div className="space-y-2">
          <p className="text-sm text-destructive">{LOCATION_FAILURE_MESSAGES[failure]}</p>
          {failure === 'denied' && <LocationHelp />}
        </div>
      )}
      <Button variant="outline" className="w-full justify-center gap-2" onClick={handleUpdate} disabled={locating}>
        {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
        {locating ? 'Finding your location…' : 'Update location now'}
      </Button>
    </div>
  );
};

export default LocationSetting;
