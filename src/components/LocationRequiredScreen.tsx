import { MapPin, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import GradientShell from '@/components/GradientShell';
import LocationHelp from '@/components/LocationHelp';
import { signOut } from '@/lib/signOut';

// Shown instead of the app while location access is turned off. Matches are
// based on where people really are, so LovKey can't be used without it.
const LocationRequiredScreen = ({ checking, onRetry }: { checking: boolean; onRetry: () => void }) => (
  <GradientShell centered>
    <Card className="w-full max-w-md p-6 space-y-5 text-center">
      <MapPin className="w-12 h-12 mx-auto text-primary" />
      <div className="space-y-2">
        <h1 className="text-xl font-bold text-foreground">Turn on location to keep using LovKey</h1>
        <p className="text-sm text-muted-foreground">
          Your matches are people near where you actually are, so LovKey checks your location once a day.
          We only keep your city and approximate position.
        </p>
      </div>
      <LocationHelp />
      <Button onClick={onRetry} disabled={checking} className="w-full">
        {checking ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MapPin className="w-4 h-4 mr-2" />}
        {checking ? 'Checking…' : "I've turned it on"}
      </Button>
      <button
        type="button"
        onClick={signOut}
        className="text-sm text-muted-foreground underline underline-offset-2"
      >
        Sign out
      </button>
    </Card>
  </GradientShell>
);

export default LocationRequiredScreen;
