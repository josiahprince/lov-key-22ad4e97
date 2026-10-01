import {
  CHAT_INACTIVITY_HOURS,
  MATCH_EXPIRY_HOURS,
  MAX_ACTIVE_CHATS,
  PHOTO_REVEAL_INITIAL_THRESHOLD,
} from '@/lib/constants';

// Bump TERMS_VERSION whenever the text below changes materially. Sign-up
// records the version a user agreed to in their auth user_metadata.
export const TERMS_VERSION = '2026-10-01';
export const TERMS_LAST_UPDATED = 'October 1, 2026';

// Same rule as TERMS_VERSION, recorded alongside it at sign-up.
export const PRIVACY_VERSION = '2026-10-01';
export const PRIVACY_LAST_UPDATED = 'October 1, 2026';

// TODO(owner): replace these placeholders before launch.
export const LEGAL_OPERATOR = '[Company Name]';
export const SUPPORT_EMAIL = '[support@yourdomain.com]';
export const GOVERNING_COUNTRY = '[Country]';
// Region of the Supabase project (Dashboard → Project Settings → General).
export const HOSTING_REGION = '[Hosting region]';

export interface LegalSection {
  id: string;
  title: string;
  paragraphs?: string[];
  bullets?: string[];
  // Shown after the bullets.
  note?: string;
}

export const TERMS_SECTIONS: LegalSection[] = [
  {
    id: 'acceptance',
    title: '1. Accepting these Terms',
    paragraphs: [
      `These Terms and Conditions ("Terms") are an agreement between you and ${LEGAL_OPERATOR} ("LovKey", "we", "us"). By creating an account or using LovKey, you agree to these Terms and to the Community Rules below. If you do not agree, do not use LovKey.`,
      'We may update these Terms as the service changes. If we make material changes we will tell you in the app, and continuing to use LovKey after that means you accept the updated Terms.',
    ],
  },
  {
    id: 'eligibility',
    title: '2. Who can use LovKey',
    paragraphs: ['To create an account you must:'],
    bullets: [
      'Be at least 18 years old. We check your date of birth at sign-up and remove accounts we believe belong to minors.',
      'Be legally able to enter into a binding contract where you live.',
      'Not have been convicted of, or be subject to a court order relating to, a sexual offence or violent crime.',
      'Not have been previously removed from LovKey for breaking these Terms.',
      'Have only one account, and create it for yourself using accurate information.',
    ],
  },
  {
    id: 'account',
    title: '3. Your account',
    bullets: [
      'Keep your login details confidential. You are responsible for all activity on your account.',
      'Your profile must be about you. Use your own photos and do not impersonate anyone.',
      'You can change your password, download a copy of your data, or permanently delete your account at any time from Settings. If you forget your password, use "Forgot password?" on the sign-in screen.',
      'We may suspend or remove an account that breaks these Terms, puts other users at risk, or that we are legally required to remove.',
    ],
  },
  {
    id: 'how-it-works',
    title: '4. How LovKey works',
    paragraphs: [
      'LovKey is built around slower, more intentional connections. By using it you understand and accept how matching and chats work:',
    ],
    bullets: [
      'Daily check-in: once a day, on your first visit after 06:00 local time, you share your mood, pick vibes, and answer the question of the week. Your answers are used to suggest that day’s matches.',
      `Daily matches: suggested matches expire after ${MATCH_EXPIRY_HOURS} hours if no chat is started. Both people are notified, and an expired match is not suggested again for at least 7 days.`,
      `Active chat limit: you can have up to ${MAX_ACTIVE_CHATS} active chats at a time. While you are at the limit you will not receive new matches and cannot start or accept new chats.`,
      `Inactive chats: if either person has not sent a message in a chat for ${CHAT_INACTIVITY_HOURS} hours, the chat closes for both people. The conversation cannot be reopened.`,
      `Photo privacy: photos stay blurred to your matches. After ${PHOTO_REVEAL_INITIAL_THRESHOLD} messages, both of you are asked whether to reveal them, and photos are only revealed if you both agree.`,
      'Weekly vibes: the vibe options shown in onboarding are generated automatically, with the help of an AI service, for everyone in your country each week. They are light-hearted suggestions and not statements of fact.',
      'Matches are suggestions based on your preferences and answers. We do not guarantee any number of matches, any particular match, or any outcome.',
    ],
  },
  {
    id: 'community-rules',
    title: '5. Community Rules',
    paragraphs: ['You agree not to:'],
    bullets: [
      'Harass, bully, threaten, stalk, intimidate, or demean anyone.',
      'Post or send sexually explicit content, nudity, or unsolicited sexual messages.',
      'Post content that is hateful or discriminatory, including on the basis of race, ethnicity, religion, disability, gender, gender identity, or sexual orientation.',
      'Promote or glorify violence, self-harm, or illegal activity.',
      'Share anyone else’s private information, including photos revealed to you in a chat, without their consent.',
      'Use LovKey for commercial purposes: advertising, selling, soliciting money or gifts, or recruiting.',
      'Scam, defraud, or catfish other users, or ask them for financial information.',
      'Create fake profiles, use bots or automated scripts, or scrape data from the service.',
      'Try to get around blocks, limits, or security features, or interfere with how LovKey runs.',
      'Use LovKey if you are in a relationship where doing so would deceive a partner, or for any unlawful purpose.',
    ],
  },
  {
    id: 'your-content',
    title: '6. Your content',
    paragraphs: [
      'You own the content you add to LovKey: your profile details, photos, answers, and messages. To run the service, you give us a worldwide, non-exclusive, royalty-free licence to host, store, process, and display that content to you and the people you match with, for as long as your account exists.',
      'You confirm that you have the rights to everything you upload and that it does not break these Terms or the law. We may remove content that breaks these Terms.',
    ],
  },
  {
    id: 'safety',
    title: '7. Your safety and other users',
    paragraphs: [
      'You are responsible for your interactions with other users. LovKey does not run criminal background checks or verify identities, and we cannot guarantee how anyone behaves on or off the app.',
    ],
    bullets: [
      'Never send money or financial details to someone you met on LovKey.',
      'Keep conversations in the app until you trust someone.',
      'Meet for the first time in a public place, tell a friend where you are going, and arrange your own transport.',
      'If you feel unsafe, leave and contact local emergency services.',
    ],
  },
  {
    id: 'reporting',
    title: '8. Blocking, reporting, and moderation',
    bullets: [
      'You can block anyone from their profile or your chat. A blocked person can no longer contact you, and the two of you will not be matched again.',
      'You can report someone for harassment, inappropriate content, a fake profile, spam, suspected underage use, or anything else. When you report someone from a chat, a copy of up to the last 200 messages in that chat is attached to the report so we can review it.',
      'We review reports and may warn, restrict, or remove accounts. We may also keep report records and share information with law enforcement where the law requires it or where someone’s safety is at risk.',
      'Do not file false or malicious reports.',
    ],
  },
  {
    id: 'privacy',
    title: '9. Privacy and your data',
    paragraphs: [
      'Our Privacy Policy explains what information we collect, how we use it to suggest matches, who can see it, how long we keep it, and how to download or delete it. By using LovKey you acknowledge that Privacy Policy. In short: we never sell your personal information, your photos stay blurred until you and a match both choose to reveal them, and you can download or delete your data at any time from Settings.',
    ],
  },
  {
    id: 'termination',
    title: '10. Ending your use of LovKey',
    paragraphs: [
      'You can stop using LovKey and delete your account at any time from Settings → Delete account. Deletion is immediate and cannot be undone. We may suspend or end your access if you break these Terms. Sections 6 to 13 continue to apply after your account ends.',
    ],
  },
  {
    id: 'disclaimers',
    title: '11. Disclaimers',
    paragraphs: [
      'LovKey is provided "as is" and "as available". To the fullest extent the law allows, we make no warranties about the service, including that it will be uninterrupted or error-free, or that you will find a match or a relationship. We are not responsible for the conduct of any user, on or off LovKey.',
    ],
  },
  {
    id: 'liability',
    title: '12. Limitation of liability',
    paragraphs: [
      'To the fullest extent the law allows, LovKey and its team are not liable for any indirect, incidental, special, consequential, or punitive damages, or for any loss of data, profits, or goodwill, arising from your use of the service or from your interactions with other users. Nothing in these Terms limits liability that cannot legally be limited.',
    ],
  },
  {
    id: 'law',
    title: '13. Governing law and disputes',
    paragraphs: [
      `These Terms are governed by the laws of ${GOVERNING_COUNTRY}. Before starting any formal dispute, please contact us so we can try to resolve it informally. Any dispute that cannot be resolved that way will be handled by the courts of ${GOVERNING_COUNTRY}, unless the law where you live gives you the right to bring a claim locally.`,
    ],
  },
  {
    id: 'contact',
    title: '14. Contact us',
    paragraphs: [`Questions about these Terms? Email ${SUPPORT_EMAIL}.`],
  },
];

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    id: 'about',
    title: '1. About this policy',
    paragraphs: [
      `This Privacy Policy explains how ${LEGAL_OPERATOR} ("LovKey", "we", "us") collects, uses, shares, and protects your information when you use LovKey. It should be read with our Terms & Conditions. LovKey is only for adults aged 18 and over.`,
    ],
  },
  {
    id: 'what-you-give-us',
    title: '2. Information you give us',
    bullets: [
      'Account: your email address and password. Your password is stored only as a secure hash, and we cannot see it.',
      'Profile: first and last name, nickname, date of birth and age, gender, sexual orientation, who you are interested in, religion, languages, interests, personality prompts, your "about me" description, and optionally a phone number.',
      'Match preferences: the age range and distance you want matches within.',
      'Photos: up to 6 profile photos.',
      'Location: your city, region, and country, plus the approximate coordinates used to measure distance to other users. These come from your device location (if you allow it) or from a place you type in.',
      'Daily check-in: your mood, the vibes you pick, and your answer to the question of the week, given once a day.',
      'Messages: everything you send in chats, and your choices when asked whether to reveal photos.',
      'Safety actions: the people you block and the reports you file, including any details you write.',
    ],
  },
  {
    id: 'sensitive',
    title: '3. Sensitive information',
    paragraphs: [
      'Your sexual orientation, gender, who you are interested in, and religion can reveal sensitive information about you. You choose to add them so LovKey can suggest compatible matches, and by adding them you consent to us using them for that. You can change them in your profile at any time, or delete your account to remove them completely.',
    ],
  },
  {
    id: 'what-we-create',
    title: '4. Information created as you use LovKey',
    bullets: [
      'Matches: who you were matched with and when, the compatibility score, whether a chat was requested or accepted, and whether the match or chat is active, expired, or closed.',
      `Activity: when you last sent a message in each chat. This is how we apply the ${CHAT_INACTIVITY_HOURS}-hour inactivity rule.`,
      'Notifications we send you in the app, and whether you have read them.',
      'Technical data: sign-in times, and the IP address and browser or device details recorded in our hosting provider’s security logs.',
    ],
  },
  {
    id: 'how-we-use',
    title: '5. How we use your information',
    bullets: [
      'Suggesting daily matches. Each day we compare your check-in answers (mood and vibes), gender and who you are interested in, age range, distance, interests, languages, and personality prompts with other users’ to choose compatible people. Matching is automated; no person picks your matches.',
      `Running LovKey’s rules: expiring matches after ${MATCH_EXPIRY_HOURS} hours, limiting you to ${MAX_ACTIVE_CHATS} active chats, closing inactive chats, not repeating recent matches, and keeping photos blurred until you both agree to reveal them.`,
      'Keeping people safe: reviewing reports, enforcing our Community Rules, preventing spam and abuse, and acting on suspected underage use.',
      'Contacting you: in-app notifications about matches and chats, and account emails such as password resets. We do not send marketing emails.',
      'Meeting legal obligations and responding to lawful requests.',
    ],
    note: 'We do not sell your personal information, show you advertising, or use your data to profile you for anyone else.',
  },
  {
    id: 'who-sees',
    title: '6. What other users can see',
    paragraphs: [
      'LovKey has no public browsing. Only people you are matched with can see your profile. A match can see:',
    ],
    bullets: [
      'Your nickname, age, gender, sexual orientation, who you are interested in, religion, city, region and country, languages, interests, personality prompts, and description.',
      'Your daily check-in answers (mood, vibes, and your answer to the question of the week).',
      `Your photos, blurred. They are only revealed if you both choose to reveal them after ${PHOTO_REVEAL_INITIAL_THRESHOLD} messages.`,
      'The messages you send them.',
    ],
  },
  {
    id: 'not-shared-with-users',
    title: '7. What other users never see',
    paragraphs: [
      'Your first and last name, date of birth, email address, phone number, exact location, the people you block, and the reports you file. A blocked person is not told they were blocked, and a reported person is not told who reported them.',
    ],
  },
  {
    id: 'sharing',
    title: '8. Who we share information with',
    paragraphs: ['We share information only with the service providers that help us run LovKey, and only what each one needs:'],
    bullets: [
      'Supabase: hosts our database, sign-in, photo storage, and server functions. All of your account data is stored there.',
      'OpenStreetMap (Nominatim): when you set your location, our server sends it your coordinates or the place you typed to look up the matching city and country. Your name and account are never sent.',
      'An AI provider: generates each week’s vibe options for a country. It receives only the country name and the week, never anything about you.',
      'Resend: delivers the email alerts our moderation team receives when someone files a report. Those emails include the reason, the details written, and both people’s nicknames.',
    ],
  },
  {
    id: 'legal-disclosure',
    title: '9. Legal requests and business changes',
    paragraphs: [
      'We may disclose information if the law requires it, to respond to valid legal requests, or to protect someone’s safety. If LovKey is ever merged or sold, your information may transfer to the new owner, who must continue to protect it under this policy.',
    ],
  },
  {
    id: 'retention',
    title: '10. How long we keep your information',
    bullets: [
      'While your account is open we keep your information so LovKey keeps working.',
      'Expired matches and closed chats disappear from your screen, but they stay stored with your account until you delete it. This lets us prevent repeat matches and review reports.',
      'When you delete your account, we immediately and permanently delete your profile, photos, check-in answers, notifications, matches, and every chat you were part of, for both people.',
      'Reports are the exception. A report you filed, or that was filed about you, including the copy of recent chat messages attached to it, is kept after deletion for safety and legal reasons. It stays linked only to an anonymous account ID, not to your name or email.',
      'Copies may remain in our hosting provider’s backups and security logs for a short period until those are automatically overwritten.',
    ],
  },
  {
    id: 'your-rights',
    title: '11. Your rights and choices',
    bullets: [
      'Download your data: Settings → Download my data gives you a file containing your account details, profile, photos, preferences, check-in answers, matches, the messages you sent, notifications, blocks, and the reports you filed.',
      'Correct your data: edit your profile and preferences at any time.',
      'Delete your data: Settings → Delete account removes it immediately (see section 10).',
      'Withdraw consent: remove sensitive details from your profile, turn off location access in your device settings, or delete your account.',
      `Depending on where you live, you may also have the right to object to or restrict certain uses of your data, and to complain to your local data protection authority. To use any of these rights, email ${SUPPORT_EMAIL}.`,
    ],
  },
  {
    id: 'security',
    title: '12. How we protect your information',
    paragraphs: [
      'Your data is protected by encrypted connections, row-level access rules that let each person read only what they are allowed to see, hashed passwords, and private photo storage that is shared only through short-lived links. No system is completely secure, so please use a strong, unique password and tell us right away if you think your account has been compromised.',
    ],
  },
  {
    id: 'transfers',
    title: '13. Where your information is stored',
    paragraphs: [
      `Your information is stored on servers in ${HOSTING_REGION}. Our service providers may process it in other countries. Where the law requires it, we rely on appropriate safeguards for those transfers.`,
    ],
  },
  {
    id: 'children',
    title: '14. Children',
    paragraphs: [
      'LovKey is not for anyone under 18. We check date of birth at sign-up, and we delete any account we learn belongs to a minor. If you believe a minor is using LovKey, please report them in the app or email us.',
    ],
  },
  {
    id: 'changes',
    title: '15. Changes to this policy',
    paragraphs: [
      'We will update this policy when LovKey changes how it handles your information, and tell you in the app about any significant change. The date at the top shows when it was last updated.',
    ],
  },
  {
    id: 'contact',
    title: '16. Contact us',
    paragraphs: [`Questions or requests about your privacy? Email ${SUPPORT_EMAIL}.`],
  },
];
