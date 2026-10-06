import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import GradientShell from '@/components/GradientShell';
import ScreenHeader from '@/components/ScreenHeader';
import type { LegalSection } from '@/lib/legal';

interface LegalDocumentProps {
  title: string;
  lastUpdated: string;
  sections: LegalSection[];
}

// Shared layout for the Terms and Privacy Policy pages. Both live outside
// AppLayout so they can be read before signing up.
const LegalDocument = ({ title, lastUpdated, sections }: LegalDocumentProps) => {
  const navigate = useNavigate();
  const { hash } = useLocation();

  // React Router doesn't scroll to #anchors on client-side navigation.
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [hash]);

  // Opened in a new tab from the sign-up form there is no history to go back
  // to, so fall back to the app root.
  const goBack = () => {
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate('/', { replace: true });
  };

  return (
    <GradientShell withCard>
      <div className="p-4 pb-10 space-y-6">
        <ScreenHeader onBack={goBack} backLabel="Back" title={title} subtitle={`Last updated ${lastUpdated}`} />

        <nav aria-label="Contents" className="rounded-xl border bg-accent/40 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground/70 mb-2">Contents</p>
          <ol className="space-y-1 text-sm">
            {sections.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`} className="text-primary hover:underline">
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {sections.map((section) => (
          <section key={section.id} id={section.id} className="space-y-2 scroll-mt-4">
            <h2 className="text-base font-semibold text-foreground">{section.title}</h2>
            {section.paragraphs?.map((text, i) => (
              <p key={i} className="text-sm leading-relaxed text-foreground/80">
                {text}
              </p>
            ))}
            {section.bullets && (
              <ul className="list-disc pl-5 space-y-1.5 text-sm leading-relaxed text-foreground/80">
                {section.bullets.map((text, i) => (
                  <li key={i}>{text}</li>
                ))}
              </ul>
            )}
            {section.note && <p className="text-sm leading-relaxed font-medium text-foreground/90">{section.note}</p>}
          </section>
        ))}
      </div>
    </GradientShell>
  );
};

export default LegalDocument;
