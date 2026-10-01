import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

const TIPS = [
  {
    title: 'Keep money out of it',
    body: 'Never send money, gift cards, crypto, or bank details to someone you met on LovKey, whatever the story.',
  },
  {
    title: 'Stay in the app at first',
    body: 'Keep chatting here until you trust someone. Scammers often push to move to another app quickly.',
  },
  {
    title: 'Protect your details',
    body: "Don't share your home address, workplace, or daily routine early on. Photos stay blurred until you both choose to reveal them.",
  },
  {
    title: 'Meet in public',
    body: 'Meet somewhere busy for the first few dates, tell a friend where you’ll be, and arrange your own way there and back.',
  },
  {
    title: 'Trust your instincts',
    body: "If something feels off, you can stop replying, block, or report. You don't owe anyone an explanation.",
  },
  {
    title: 'Block and report',
    body: 'Use the ⋮ menu on a chat or profile to block or report someone. Reports go to the LovKey team for review.',
  },
];

const SafetyTipsSheet = () => (
  <Sheet>
    <SheetTrigger asChild>
      <Button variant="outline" className="w-full justify-start gap-2">
        <ShieldCheck className="h-4 w-4" />
        Safety tips
      </Button>
    </SheetTrigger>
    <SheetContent className="overflow-y-auto">
      <SheetHeader>
        <SheetTitle>Dating safely</SheetTitle>
      </SheetHeader>
      <div className="mt-4 space-y-4">
        {TIPS.map((tip) => (
          <div key={tip.title} className="space-y-1">
            <p className="font-medium text-sm">{tip.title}</p>
            <p className="text-sm text-muted-foreground">{tip.body}</p>
          </div>
        ))}
        <p className="text-sm text-muted-foreground border-t pt-4">
          If you are ever in danger, contact your local emergency services right away.
        </p>
      </div>
    </SheetContent>
  </Sheet>
);

export default SafetyTipsSheet;
