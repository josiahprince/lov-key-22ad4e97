import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

const EmptyState = ({ icon: Icon, title, description, action, className }: EmptyStateProps) => (
  <div className={cn('text-center space-y-2 py-6', className)}>
    {Icon && <Icon className="w-8 h-8 mx-auto text-muted-foreground" />}
    <p className="text-sm text-foreground font-medium">{title}</p>
    {description && <p className="text-xs text-muted-foreground">{description}</p>}
    {action && <div className="pt-2">{action}</div>}
  </div>
);

export default EmptyState;
