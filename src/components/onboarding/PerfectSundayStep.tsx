import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface PerfectSundayStepProps {
  promptAnswer: string;
  onChangePromptAnswer: (value: string) => void;
  onBack: () => void;
  onComplete: () => void;
}

const PerfectSundayStep = ({
  promptAnswer,
  onChangePromptAnswer,
  onBack,
  onComplete,
}: PerfectSundayStepProps) => (
  <div className="space-y-4 animate-fade-in">
    <div className="space-y-3">
      <h3 className="text-lg font-bold text-center bg-gradient-to-r from-primary via-primary/70 to-orange-500 bg-clip-text text-transparent">
        Describe your perfect Sunday
      </h3>
      <Textarea
        placeholder="Maybe sleeping in, reading a book, trying a new recipe, or exploring a local market..."
        value={promptAnswer}
        onChange={(e) => onChangePromptAnswer(e.target.value)}
        className="min-h-[80px] rounded-xl text-sm"
      />
      <p className="text-xs text-gray-500 text-center">
        Be yourself! There's no wrong answer here.
      </p>
    </div>

    <div className="flex space-x-2">
      <Button onClick={onBack} variant="outline" className="flex-1 py-2 rounded-xl">
        Back
      </Button>
      <Button
        onClick={onComplete}
        disabled={!promptAnswer.trim()}
        className="flex-1 py-2 rounded-xl"
      >
        Complete
      </Button>
    </div>
  </div>
);

export default PerfectSundayStep;
