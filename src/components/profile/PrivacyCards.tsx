
import { Card } from '@/components/ui/card';
import { Heart } from 'lucide-react';
import { PHOTO_UNLOCK_THRESHOLD } from '@/lib/constants';

const PrivacyCards = () => {
  return (
    <Card className="p-4 bg-accent border-primary/20">
      <div className="text-center space-y-2">
        <Heart className="w-6 h-6 mx-auto text-primary" />
        <h4 className="font-medium text-accent-foreground">Privacy First</h4>
        <p className="text-sm text-accent-foreground/80">
          Your photos stay blurred until you and your match exchange {PHOTO_UNLOCK_THRESHOLD} messages
        </p>
      </div>
    </Card>
  );
};

export default PrivacyCards;
