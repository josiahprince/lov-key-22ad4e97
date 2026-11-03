import type { ReactNode } from 'react';
import { ShieldCheck } from 'lucide-react';

export const AuthCard = ({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) => (
  <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
    <div className="w-full max-w-sm bg-card border rounded-xl shadow-sm p-6 space-y-5">
      <div className="space-y-1 text-center">
        <ShieldCheck className="mx-auto h-8 w-8 text-primary" />
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {children}
    </div>
  </div>
);
