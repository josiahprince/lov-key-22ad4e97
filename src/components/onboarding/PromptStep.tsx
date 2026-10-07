import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface PromptStepProps {
  question: string;
  placeholder: string;
  promptAnswer: string;
  onChangePromptAnswer: (value: string) => void;
  onBack: () => void;
  onComplete: () => void;
}

// The question of the week (see useWeeklyPrompt).
const PromptStep = ({
  question,
  placeholder,
  promptAnswer,
  onChangePromptAnswer,
  onBack,
  onComplete,
}: PromptStepProps) => (
  <div className="space-y-4 animate-fade-in">
    <div className="space-y-3">
      <p className="text-xs font-medium text-center text-muted-foreground uppercase tracking-wide">
        Question of the week
      </p>
      <h3 className="text-lg font-bold text-center bg-gradient-to-r from-primary via-primary/70 to-orange-500 bg-clip-text text-transparent">
        {question}
      </h3>
      <Textarea
        placeholder={placeholder}
        value={promptAnswer}
        onChange={(e) => onChangePromptAnswer(e.target.value)}
        className="min-h-[80px] rounded-xl text-sm"
      />
      <p className="text-xs text-muted-foreground text-center">
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

export default PromptStep;
