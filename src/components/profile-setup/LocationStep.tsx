
import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MapPin, Loader2, AlertCircle, Pencil } from 'lucide-react';
import { useProfileSetup } from './ProfileSetupContext';
import { useGeolocation } from '@/hooks/useGeolocation';

const LocationStep = () => {
  const { formData, updateField } = useProfileSetup();
  const { location, loading, error, getCurrentLocation, resetLocation, forwardGeocode } = useGeolocation();
  const [mode, setMode] = useState<'gps' | 'manual'>('gps');
  const [manualCity, setManualCity] = useState(formData.city);
  const [manualRegion, setManualRegion] = useState(formData.region);
  const [manualCountry, setManualCountry] = useState(formData.country);
  const [geocoding, setGeocoding] = useState(false);

  const applyLocation = (data: { city: string; region: string; country: string; fullAddress: string; latitude: number | null; longitude: number | null }) => {
    updateField('location', data.fullAddress);
    updateField('city', data.city);
    updateField('region', data.region);
    updateField('country', data.country);
    updateField('latitude', data.latitude);
    updateField('longitude', data.longitude);
  };

  const handleUseCurrentLocation = () => {
    resetLocation();
    getCurrentLocation();
  };

  // Sync a successful GPS read into form data as soon as it lands.
  useEffect(() => {
    if (location) {
      applyLocation(location);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  const switchToManual = () => {
    setMode('manual');
  };

  const handleManualSave = async () => {
    if (!manualCity.trim() || !manualCountry.trim()) return;

    const fullAddress = [manualCity, manualRegion, manualCountry].filter(Boolean).join(', ');

    setGeocoding(true);
    // Best-effort: fill in an approximate lat/long for distance-based
    // matching. If this fails or finds nothing, coordinates stay null and
    // matching falls back to country-only comparison - never blocks saving.
    const geocoded = await forwardGeocode(fullAddress);
    setGeocoding(false);

    applyLocation({
      city: manualCity.trim(),
      region: manualRegion.trim(),
      country: manualCountry.trim(),
      fullAddress,
      latitude: geocoded?.latitude ?? null,
      longitude: geocoded?.longitude ?? null,
    });
  };

  const hasSavedLocation = Boolean(formData.city && formData.country);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-center mb-6">Location</h2>

      {mode === 'gps' && (
        <>
          {!location && !loading && !error && (
            <Card className="p-4 text-center space-y-4">
              <MapPin className="w-12 h-12 mx-auto text-primary" />
              <div>
                <h3 className="font-medium text-gray-800 mb-2">Detect Your Location</h3>
                <p className="text-sm text-gray-600 mb-4">
                  We'll automatically detect your location to help you find matches nearby
                </p>
                <Button onClick={handleUseCurrentLocation} className="w-full">
                  <MapPin className="w-4 h-4 mr-2" />
                  Use My Current Location
                </Button>
              </div>
            </Card>
          )}

          {loading && (
            <Card className="p-4 text-center space-y-4">
              <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
              <div>
                <h3 className="font-medium text-gray-800">Getting Your Location...</h3>
                <p className="text-sm text-gray-600">This may take a few seconds</p>
              </div>
            </Card>
          )}

          {error && (
            <Card className="p-4 text-center space-y-4 border-orange-200 bg-orange-50">
              <AlertCircle className="w-8 h-8 mx-auto text-orange-500" />
              <div>
                <h3 className="font-medium text-gray-800">Location Error</h3>
                <p className="text-sm text-gray-600 mb-4">{error}</p>
                <Button onClick={handleUseCurrentLocation} className="w-full">
                  Try Again
                </Button>
              </div>
            </Card>
          )}

          {location && (
            <Card className="p-4 space-y-4 border-green-200 bg-green-50">
              <div className="flex items-center space-x-2">
                <MapPin className="w-5 h-5 text-green-600" />
                <h3 className="font-medium text-green-800">Location Detected</h3>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">City:</span> {location.city}
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Region:</span> {location.region}
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Country:</span> {location.country}
                </p>
              </div>
              <Button onClick={handleUseCurrentLocation} variant="outline" size="sm" className="w-full">
                Refresh Location
              </Button>
            </Card>
          )}

          <button
            type="button"
            onClick={switchToManual}
            className="w-full text-center text-sm text-primary underline underline-offset-2 flex items-center justify-center gap-1"
          >
            <Pencil className="w-3.5 h-3.5" />
            Enter my location manually instead
          </button>
        </>
      )}

      {mode === 'manual' && (
        <div className="space-y-4">
          <Card className="p-4 space-y-4">
            <div>
              <Label htmlFor="manual_city">City *</Label>
              <Input
                id="manual_city"
                value={manualCity}
                onChange={(e) => setManualCity(e.target.value)}
                placeholder="e.g. Bengaluru"
              />
            </div>
            <div>
              <Label htmlFor="manual_region">State / Region</Label>
              <Input
                id="manual_region"
                value={manualRegion}
                onChange={(e) => setManualRegion(e.target.value)}
                placeholder="e.g. Karnataka"
              />
            </div>
            <div>
              <Label htmlFor="manual_country">Country *</Label>
              <Input
                id="manual_country"
                value={manualCountry}
                onChange={(e) => setManualCountry(e.target.value)}
                placeholder="e.g. India"
              />
            </div>
            <Button
              onClick={handleManualSave}
              disabled={!manualCity.trim() || !manualCountry.trim() || geocoding}
              className="w-full"
            >
              {geocoding ? 'Saving...' : 'Save Location'}
            </Button>
          </Card>

          <button
            type="button"
            onClick={() => setMode('gps')}
            className="w-full text-center text-sm text-primary underline underline-offset-2 flex items-center justify-center gap-1"
          >
            <MapPin className="w-3.5 h-3.5" />
            Use my current location instead
          </button>
        </div>
      )}

      {hasSavedLocation && (
        <p className="text-xs text-gray-500 text-center">
          Saved: {formData.city}{formData.region ? `, ${formData.region}` : ''}, {formData.country}
        </p>
      )}
    </div>
  );
};

export default LocationStep;
