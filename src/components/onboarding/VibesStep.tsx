import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { Vibe } from '@/hooks/useCulturalVibes';

export const MAX_SELECTED_VIBES = 3;

interface VibesStepProps {
  vibes: Vibe[];
  selectedMemes: string[];
  onToggleMeme: (memeId: string) => void;
  onBack: () => void;
  onNext: () => void;
}

const VibesStep = ({ vibes, selectedMemes, onToggleMeme, onBack, onNext }: VibesStepProps) => (
  <div className="space-y-3 animate-fade-in">
    <div className="text-center space-y-1">
      <h2 className="text-lg font-bold text-gray-800">Pick your vibes</h2>
      <p className="text-xs text-gray-600">Choose up to {MAX_SELECTED_VIBES} that represent you today</p>
      <p className="text-xs text-primary">{selectedMemes.length}/{MAX_SELECTED_VIBES} selected</p>
    </div>

    <div className="space-y-1 max-h-52 overflow-y-auto">
      {vibes.map((meme) => (
        <Card
          key={meme.id}
          className={`p-2 cursor-pointer transition-all duration-200 hover:scale-105 border-2 ${
            selectedMemes.includes(meme.id)
              ? 'bg-accent border-primary/20 text-accent-foreground'
              : 'bg-gray-50 hover:bg-gray-100'
          }`}
          onClick={() => onToggleMeme(meme.id)}
        >
          <div className="flex items-center space-x-2">
            <div className="text-base">{meme.emoji}</div>
            <div>
              <h3 className="text-xs font-medium">{meme.title}</h3>
              <p className="text-xs text-gray-600">{meme.description}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>

    <div className="flex space-x-2">
      <Button onClick={onBack} variant="outline" className="flex-1 py-2 rounded-xl">
        Back
      </Button>
      <Button
        onClick={onNext}
        disabled={selectedMemes.length === 0}
        className="flex-1 py-2 rounded-xl"
      >
        Next
      </Button>
    </div>
  </div>
);

export default VibesStep;
