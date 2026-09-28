import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MOODS } from '@/components/onboarding/moods';

interface MoodStepProps {
  mood: string;
  onSelectMood: (moodId: string) => void;
  onNext: () => void;
}

const MoodStep = ({ mood, onSelectMood, onNext }: MoodStepProps) => (
  <div className="space-y-3 animate-fade-in">
    <div className="space-y-2">
      <h2 className="text-base font-medium text-gray-700">What's your current mood?</h2>
      <div className="grid grid-cols-3 gap-2">
        {MOODS.map((m) => {
          const IconComponent = m.icon;
          return (
            <Card
              key={m.id}
              className={`p-2 cursor-pointer transition-all duration-200 hover:scale-105 border-2 ${
                mood === m.id ? m.color : 'bg-gray-50 hover:bg-gray-100'
              }`}
              onClick={() => onSelectMood(m.id)}
            >
              <div className="text-center space-y-1">
                <IconComponent className="w-5 h-5 mx-auto" />
                <p className="text-xs font-medium">{m.label}</p>
              </div>
            </Card>
          );
        })}
      </div>
    </div>

    <Button
      onClick={onNext}
      disabled={!mood}
      className="w-full py-2 rounded-xl transition-all duration-200"
    >
      Next
    </Button>
  </div>
);

export default MoodStep;
