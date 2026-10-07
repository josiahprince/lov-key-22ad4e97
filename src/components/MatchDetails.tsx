// The matched person's answers from their latest daily onboarding: mood, every
// vibe they picked, and the question of the week with their answer. Shared by
// the Matches and Chats cards so both always show the same thing.
interface MatchDetailsProps {
  mood: string;
  vibes: { emoji: string; title: string }[];
  promptQuestion?: string | null;
  promptAnswer?: string | null;
}

const MatchDetails = ({ mood, vibes, promptQuestion, promptAnswer }: MatchDetailsProps) => (
  <>
    <div>
      <h4 className="text-xs font-medium text-foreground/80 mb-1">Current Mood</h4>
      <div className="flex items-center space-x-2">
        <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
        <span className="text-sm text-muted-foreground capitalize">{mood}</span>
      </div>
    </div>

    {vibes.length > 0 && (
      <div>
        <h4 className="text-xs font-medium text-foreground/80 mb-2">Their Vibes</h4>
        <div className="flex flex-wrap gap-2">
          {vibes.map((vibe, index) => (
            <div key={index} className="flex items-center space-x-1 px-2 py-1 bg-accent border border-primary/20 rounded-lg">
              <div className="text-xs">{vibe.emoji}</div>
              <span className="text-xs font-medium text-accent-foreground">{vibe.title}</span>
            </div>
          ))}
        </div>
      </div>
    )}

    {promptAnswer && (
      <div>
        <h4 className="text-xs font-medium text-foreground/80 mb-1">{promptQuestion || 'Describe your perfect Sunday'}</h4>
        <div className="p-3 bg-muted rounded-lg">
          <p className="text-sm text-foreground/80">"{promptAnswer}"</p>
        </div>
      </div>
    )}
  </>
);

export default MatchDetails;
