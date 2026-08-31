import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface GradientShellProps {
  children: ReactNode;
  centered?: boolean;
  withCard?: boolean;
  className?: string;
}

const GradientShell = ({ children, centered = false, withCard = false, className }: GradientShellProps) => {
  const content = withCard ? (
    <div className="max-w-md mx-auto min-h-screen bg-white/80 backdrop-blur-sm shadow-xl">
      {children}
    </div>
  ) : (
    children
  );

  return (
    <div
      className={cn(
        'min-h-screen bg-gradient-to-br from-primary/5 via-orange-50 to-primary/10',
        centered && 'flex items-center justify-center p-4',
        className
      )}
    >
      {content}
    </div>
  );
};

export default GradientShell;
