import LegalDocument from '@/components/LegalDocument';
import { PRIVACY_LAST_UPDATED, PRIVACY_SECTIONS } from '@/lib/legal';

const PrivacyPage = () => (
  <LegalDocument title="Privacy Policy" lastUpdated={PRIVACY_LAST_UPDATED} sections={PRIVACY_SECTIONS} />
);

export default PrivacyPage;
