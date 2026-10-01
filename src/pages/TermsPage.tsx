import LegalDocument from '@/components/LegalDocument';
import { TERMS_LAST_UPDATED, TERMS_SECTIONS } from '@/lib/legal';

const TermsPage = () => (
  <LegalDocument title="Terms & Conditions" lastUpdated={TERMS_LAST_UPDATED} sections={TERMS_SECTIONS} />
);

export default TermsPage;
