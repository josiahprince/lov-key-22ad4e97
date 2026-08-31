import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ScreenHeaderAvatar {
  src?: string;
  alt: string;
  blurred?: boolean;
}

interface ScreenHeaderProps {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  backLabel?: string;
  avatar?: ScreenHeaderAvatar;
  actions?: ReactNode;
  logo?: boolean;
  className?: string;
}

const LOGO_SRC = '/lovable-uploads/c28200aa-e002-4654-86ab-fcb6351cb739.png';

const ScreenHeader = ({ title, subtitle, onBack, backLabel, avatar, actions, logo, className }: ScreenHeaderProps) => {
  if (logo) {
    return (
      <div className={cn('flex justify-between items-center', className)}>
        <div className="flex items-center space-x-2">
          <img src={LOGO_SRC} alt="LovKey Logo" className="w-8 h-8" />
          <h1 className="text-xl font-bold text-foreground">LovKey</h1>
        </div>
        {actions && <div className="flex items-center space-x-2">{actions}</div>}
      </div>
    );
  }

  if (onBack || avatar || actions) {
    return (
      <div className={cn('flex items-center justify-between', className)}>
        <div className="flex items-center space-x-2 min-w-0">
          {onBack && (
            <Button onClick={onBack} variant="ghost" size="sm" className="p-1 h-8 w-8 shrink-0">
              <ArrowLeft className="w-4 h-4" />
              {backLabel && <span className="sr-only">{backLabel}</span>}
            </Button>
          )}
          {avatar && (
            <div className="relative shrink-0">
              <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-border">
                <img
                  src={avatar.src}
                  alt={avatar.alt}
                  className={cn('w-full h-full object-cover', avatar.blurred && 'filter blur-sm')}
                />
              </div>
              {avatar.blurred && (
                <div className="absolute inset-0 w-8 h-8 bg-accent rounded-full flex items-center justify-center opacity-80">
                  <span className="text-xs">📷</span>
                </div>
              )}
            </div>
          )}
          {title && (
            <div className="min-w-0">
              <h1 className="font-semibold text-foreground text-sm truncate">{title}</h1>
              {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
            </div>
          )}
        </div>
        {actions && <div className="flex items-center space-x-1 shrink-0">{actions}</div>}
      </div>
    );
  }

  return (
    <div className={cn('text-center space-y-2', className)}>
      {title && <h1 className="text-lg font-bold text-foreground">{title}</h1>}
      {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  );
};

export default ScreenHeader;
