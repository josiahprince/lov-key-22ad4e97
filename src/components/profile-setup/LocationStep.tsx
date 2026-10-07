import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MapPin, Loader2, AlertCircle } from 'lucide-react';
import { useProfileSetup } from './ProfileSetupContext';
import { useDeviceLocation } from '@/hooks/useDeviceLocation';
import LocationHelp from '@/components/LocationHelp';
import { LOCATION_FAILURE_MESSAGES, formatPlace, toProfileLocation } from '@/lib/location';

// Location comes only from the device (see src/lib/location.ts), so there is
// no manual entry. The Next button stays disabled until a location is found.
const LocationStep = () => {
  const { formData, updateField } = useProfileSetup();
  const { locate, locating, failure } = useDeviceLocation();

  const handleLocate = async () => {
    const found = await locate();
    if (!found) return;
    const fields = toProfileLocation(found);
    updateField('location', fields.location);
    updateField('city', fields.city);
    updateField('region', fields.region);
    updateField('country', fields.country);
    updateField('latitude', fields.latitude);
    updateField('longitude', fields.longitude);
  };

  const place = formatPlace(formData);
  const hasLocation = Boolean(formData.city && formData.country);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-center mb-6">Location</h2>

      {locating ? (
        <Card className="p-4 text-center space-y-4">
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
          <div>
            <h3 className="font-medium text-foreground">Finding your location…</h3>
            <p className="text-sm text-muted-foreground">If your browser asks, choose Allow.</p>
          </div>
        </Card>
      ) : hasLocation ? (
        <Card className="p-4 space-y-3 border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/40">
          <div className="flex items-center space-x-2">
            <MapPin className="w-5 h-5 text-green-600" />
            <h3 className="font-medium text-green-800 dark:text-green-300">Location found</h3>
          </div>
          <p className="text-sm text-foreground">{place}</p>
          <p className="text-xs text-muted-foreground">
            This updates automatically once a day, so your matches stay local if you move.
          </p>
        </Card>
      ) : failure ? (
        <Card className="p-4 text-center space-y-4 border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/40">
          <AlertCircle className="w-8 h-8 mx-auto text-orange-500" />
          <div className="space-y-3">
            <h3 className="font-medium text-foreground">{LOCATION_FAILURE_MESSAGES[failure]}</h3>
            {failure === 'denied' ? (
              <LocationHelp />
            ) : (
              <p className="text-sm text-muted-foreground">Check you have a connection and try again.</p>
            )}
            <Button onClick={handleLocate} className="w-full">Try again</Button>
          </div>
        </Card>
      ) : (
        <Card className="p-4 text-center space-y-4">
          <MapPin className="w-12 h-12 mx-auto text-primary" />
          <div>
            <h3 className="font-medium text-foreground mb-2">Share your location</h3>
            <p className="text-sm text-muted-foreground mb-4">
              LovKey matches you with people near where you are, so location is required. We only keep your
              city and approximate position, and refresh it once a day.
            </p>
            <Button onClick={handleLocate} className="w-full">
              <MapPin className="w-4 h-4 mr-2" />
              Use my location
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default LocationStep;
