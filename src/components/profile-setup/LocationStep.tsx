
import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MapPin, Loader2, AlertCircle } from 'lucide-react';
import { useProfileSetup } from './ProfileSetupContext';
import { useGeolocation } from '@/hooks/useGeolocation';

const LocationStep = () => {
  const { formData, updateField } = useProfileSetup();
  const [manualEntry, setManualEntry] = useState(false);
  const { location, loading, error, permissionDenied, getCurrentLocation, resetLocation } = useGeolocation();

  // Update form data when location is detected
  useEffect(() => {
    if (location) {
      updateField('location', location.fullAddress);
      updateField('city', location.city);
      updateField('region', location.region);
      updateField('country', location.country);
      updateField('latitude', location.latitude);
      updateField('longitude', location.longitude);
    }
  }, [location, updateField]);

  const handleUseCurrentLocation = () => {
    resetLocation();
    getCurrentLocation();
  };

  const handleManualEntry = () => {
    setManualEntry(true);
    resetLocation();
  };

  if (manualEntry) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-center mb-6">Location</h2>
        <div>
          <Label htmlFor="location">Where are you located? *</Label>
          <Input
            id="location"
            value={formData.location}
            onChange={(e) => updateField('location', e.target.value)}
            placeholder="City, State/Country"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => setManualEntry(false)}
          className="w-full"
        >
          Use Automatic Location Instead
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-center mb-6">Location</h2>
      
      {!location && !loading && !error && (
        <Card className="p-4 text-center space-y-4">
          <MapPin className="w-12 h-12 mx-auto text-rose-500" />
          <div>
            <h3 className="font-medium text-gray-800 mb-2">Detect Your Location</h3>
            <p className="text-sm text-gray-600 mb-4">
              We'll automatically detect your location to help you find matches nearby
            </p>
            <div className="space-y-2">
              <Button
                onClick={handleUseCurrentLocation}
                className="w-full bg-rose-500 hover:bg-rose-600"
              >
                <MapPin className="w-4 h-4 mr-2" />
                Use My Current Location
              </Button>
              <Button
                onClick={handleManualEntry}
                variant="outline"
                className="w-full"
              >
                Enter Location Manually
              </Button>
            </div>
          </div>
        </Card>
      )}

      {loading && (
        <Card className="p-4 text-center space-y-4">
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-rose-500" />
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
            <div className="space-y-2">
              {!permissionDenied && (
                <Button
                  onClick={handleUseCurrentLocation}
                  variant="outline"
                  className="w-full"
                >
                  Try Again
                </Button>
              )}
              <Button
                onClick={handleManualEntry}
                className="w-full bg-rose-500 hover:bg-rose-600"
              >
                Enter Location Manually
              </Button>
            </div>
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
            <p className="text-sm text-gray-600 italic">
              {location.fullAddress}
            </p>
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={handleUseCurrentLocation}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              Refresh Location
            </Button>
            <Button
              onClick={handleManualEntry}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              Edit Manually
            </Button>
          </div>
        </Card>
      )}

      {location && (
        <div>
          <Label htmlFor="location_display">Your Location</Label>
          <Input
            id="location_display"
            value={formData.location}
            onChange={(e) => updateField('location', e.target.value)}
            placeholder="City, State/Country"
          />
          <p className="text-xs text-gray-500 mt-1">
            You can edit this if needed
          </p>
        </div>
      )}
    </div>
  );
};

export default LocationStep;
