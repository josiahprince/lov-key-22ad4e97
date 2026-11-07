# Pending items

Open work that needs the owner. Claude reminds you of these (see `CLAUDE.md`). Remove an item once it's done.

_Last reviewed: 2026-11-07_

## Before launch (needs you)

- [ ] **Switch on phone and email verification (code is built, branch `feat/phone-email-verification`).** Until steps 1 and 2 are done, nobody can sign up, because sign-up now starts with an SMS code. Existing accounts are unaffected and still sign in with email and password.
  1. Apply `supabase/migrations/20261016120000_account_verification.sql` in the SQL editor.
  2. Supabase → Authentication → Sign In / Providers → **Phone**: turn it on, pick Twilio, and paste the Account SID, Auth Token and Message Service SID from your Twilio account. To test without real texts, add a test number and code under "Test Phone Numbers and OTPs" on the same page.
  3. Same page → **Email**: turn on **Confirm email**, and keep "Secure email change" on. Existing users were auto-confirmed, so this only affects new sign-ups.
  4. Authentication → Emails → Templates → **Change email address**: the app asks for a code, so the email must show one. Subject `Your LovKey code`, body `<p>Your LovKey code is <strong>{{ .Token }}</strong>. It expires in 1 hour.</p>`. (New users add their email after the phone, which Supabase counts as an email change.)
  5. Optional: Authentication → SMS template, e.g. `Your LovKey code is {{ .Code }}`.
- [ ] **Cheaper SMS codes (decide before launch).** Twilio costs roughly $0.40 + $0.05 per code to Sri Lanka, against about $0.002 for a WhatsApp authentication message (third-party figures; check the providers' price pages). Until this is sorted, Twilio Verify works, it's just pricier. What we found on 2026-10-21:
  - How: one Supabase **Send SMS hook** (an edge function). Supabase still creates and checks the code; the hook only delivers it.
  - Suggested shape: the first code goes by **WhatsApp** (Meta Cloud API, an approved "authentication" template). "Resend" goes by **SMS**: Plivo for most countries, and India via MSG91 *only if you have an Indian company with a PAN* (needed for DLT registration), otherwise Plivo or Twilio Verify.
  - Ruled out: **Message Central**, because it creates its own codes and can't send Supabase's. Also an **automatic "SMS failed → WhatsApp" fallback**: the hook gets 5 seconds, and delivery failures only arrive later, so the user's Resend has to be the trigger.
  - Your side: Meta Business verification and template approval (a few days), Plivo sender registration in some countries (e.g. Bangladesh, about 20 days and $25), and DLT if you use MSG91. Claude's side: about a day of code. The app barely changes: the code screen says "on WhatsApp" and the resend button says "Send by text".
- [ ] **Bot protection on SMS codes (CAPTCHA).** Anyone can ask Supabase to text a code to any number, and bots abuse that to run up SMS bills ("SMS pumping"). Before launch, turn on CAPTCHA (Authentication → Attack Protection, e.g. Cloudflare Turnstile, which is free) and keep the SMS rate limit low (Authentication → Rate Limits). Turnstile also needs a small change in `AuthScreen` to send the CAPTCHA token; ask Claude when you have the site key. In Twilio, limit SMS to the countries you launch in (Messaging → Settings → Geo permissions).
- [ ] **AI credits for photo checks.** Automatic photo checks are live in Supabase (migration applied and functions deployed 2026-10-22). The app side is still on branch `feat/phone-email-verification`. Make sure the Lovable workspace has AI credits. Without them, every new photo stays on "Checking…" and is never shown to matches.
- [ ] **Photo verification, step 2: selfie "verified" badge.** Not started. The user takes a live selfie copying a pose, it's compared with their profile photos, and they get a badge. Needs a face-comparison service (e.g. AWS Rekognition, about $0.015 per check), explicit consent for biometric data, and a Privacy Policy update.
- [ ] **Age verification.** Users need to be verified so under-age people can't use the app. Not done yet.

- [ ] **Admin accounts (solo-founder setup, from your "Dating App Admin Setup Guide" doc).** Your side, no code needed:
  1. Done 2026-11-07: the mailboxes exist, and `breakglass@lovkey.app` is its own Workspace user with MFA, offline recovery codes and access to the services that run LovKey.
  2. Keep your current LovKey account as your personal test profile. Don't make it an admin.
  3. **Move the two admin-app logins off the spare personal emails.** Both `super_admin` logins work (2026-11-03). Change their emails to `breakglass@lovkey.app` and `admin@lovkey.app` through Supabase's admin API: `PUT /auth/v1/admin/users/<id>` with `{"email": "...", "email_confirm": true}` and the service_role key. Do break-glass first and test it before the second. The role, password and authenticator stay with the account.
  4. Once a month, try the break-glass login.
- [ ] **Legal placeholders.** `SUPPORT_EMAIL` is done (`support@lovkey.app`). Still fill in `LEGAL_OPERATOR`, `GOVERNING_COUNTRY` and `HOSTING_REGION` at the top of `src/lib/legal.ts`. Until then the Terms and Privacy Policy show `[Company Name]` and similar.
- [ ] **Password-reset redirect URL.** In Supabase → Authentication → URL Configuration → Redirect URLs, add `http://localhost:8080/**`, and once the app is hosted, `https://lovkey.app/**` (also set Site URL to `https://lovkey.app`). Without it, "Forgot password?" emails open the wrong page.
- [ ] **Custom email provider (SMTP).** Supabase's built-in sender only allows a few emails an hour, so reset and sign-up emails will start failing once real users arrive. Verify lovkey.app with a sender like Resend (it adds DNS records in Cloudflare, next to Google's), then set it in Supabase → Authentication → Emails → SMTP settings, sending from e.g. `no-reply@lovkey.app`. Once verified, `notify-report-alert` can send from `reports@lovkey.app` instead of `onboarding@resend.dev`; ask Claude.
- [ ] **Check the lovkey.app registration.** In Cloudflare → lovkey.app → Domain Registration, make sure auto-renew and the registrar lock are on. Mail setup is done: the domain was bought at Cloudflare Registrar on 2026-11-05, and Google Workspace runs `josiah@lovkey.app` (Google's MX, SPF and DKIM in Cloudflare DNS, plus DMARC `p=none` with reports to `josiah@`). `support@`, `admin@`, `grievance@` and `privacy@` are aliases of `josiah@` (2026-11-07), `breakglass@` is a separate Workspace user, and the app's `SUPPORT_EMAIL` is `support@lovkey.app`. Don't turn on Cloudflare Email Routing: it replaces Google's MX and mail stops arriving.
- [ ] **Put the web app online over HTTPS** before launch (browsers only share location on HTTPS or localhost). Easiest is Lovable → Publish (the repo is already linked; a custom domain needs a paid plan). Cloudflare Pages, Vercel or Netlify are free but need the three `VITE_SUPABASE_*` values and an SPA fallback so `/reset-password` doesn't 404; ask Claude to set that up. Lovable publishes `main`, and merging `feat/phone-email-verification` makes sign-up require SMS, so switch on phone verification first. Keep the admin app off the public site. After hosting, add the live address to Supabase → Authentication → URL Configuration (Site URL and Redirect URLs).
- [ ] **Re-accept Terms and Privacy:** both were updated on 2026-10-07 (location rules), the Privacy Policy again on 2026-10-16 (phone numbers, Twilio), and both on 2026-10-21 (automatic photo checks), and the Privacy Policy on 2026-10-30 (moderation records kept after deletion) and 2026-11-03 (warnings and bans in Download my data), so existing users are now behind on `TERMS_VERSION` / `PRIVACY_VERSION`. See the "Ask existing users" item below.

## Still to test end to end (use throwaway accounts)

- [ ] **Phone and email sign-up (after switching it on above):** Sign up → number → SMS code → email and password → emailed code → profile setup. Then sign out and sign in both ways: Phone tab with an SMS code, and Email tab with the password. Also check that closing the app between the SMS and email steps brings you back to the email step, that "Forgot password?" works for the new account, and that an existing (pre-2026-10-16) account still goes straight in.

- [ ] **Photo checks (after switching them on above):** upload a normal photo of a person (shows "Checking…", then a "Photo added" toast), then a landscape or a screenshot (red "Not approved" tile with the reason underneath). Profile setup's Next button stays off until one photo is approved. A match sees only approved photos, and a rejected main photo is replaced on their Matches card by your next approved one.

- [ ] **Remove User:** the chat disappears for both people, the remover's chat count drops by one, and the pair never gets matched again. If the other person has the chat open, it switches to "This chat has ended" within about 15 seconds.
- [ ] **Skip cooldown:** a skipped person isn't suggested again for 7 days.

- [ ] **Download my data:** the zip downloads with `data.json`, photos and `README.txt`.
- [ ] **Delete account:** profile, photos and chats disappear for both people, and any report about the deleted user is still in `reports`.
- [ ] **Forgot password:** the email arrives, the link opens `/reset-password`, the new password works and other devices get signed out.
- [ ] **6-chat cap:** the "paused" card on Matches when a user has 6 active chats (unverified since 2026-09-28).
- [ ] **Hourly expiry notifications:** `match_expired` (24h) and `chat_expired` (48h inactivity) reach both users (unverified since 2026-09-28).
- [ ] **Match preferences (Settings):** changes autosave (status reads "All changes saved", values survive leaving Settings and a page reload), the age dropdowns save correctly, the local languages show for your country, and after both of today's matches are generated, changing any preference shows the "applies from tomorrow" note and toast.
- [ ] **Dark mode on the screens not yet checked:** profile setup (new sign-up), daily onboarding, Chats list, an open chat, and the photo editor on Profile. Look for light boxes or hard-to-read text.
- [ ] **Re-check after the cleanup refactor (signed in):** Matches and Chats cards (mood, vibes, prompt and photo still load), Settings, and the Match preferences dialog (the interest list now has all 30 options).
- [ ] **Automatic location:** a new sign-up must allow location to pass the Location step (no manual entry); on the first open after 06:00 the profile city updates silently; Settings → Update location works; blocking location in the browser shows the "Turn on location" screen, and allowing it again lets you straight back in. Needs HTTPS in production (browsers only share location on HTTPS or localhost).
- [ ] **Sign out (Chrome):** Settings → Sign out and the button on the "Turn on location" screen both return to the sign-in page.
- [ ] **Card photos:** blurred photo shows on Matches and Chats cards and in the open chat header; it unblurs after both people choose reveal.
- [ ] **Location guard (migration applied 2026-10-07):** location still saves at sign-up, on the daily refresh and from Settings; a direct API edit of `city` is rejected; Settings shows the "too far from your last one" message for an impossible jump.
- [ ] **Photo reveal:** both people choose "reveal" and photos unblur (only the "wait" path has been tested).

- [ ] **Staff roles, in the SQL editor:** the bootstrap `INSERT` adds a `role.granted` row to `admin_audit_log`; `UPDATE` and `DELETE` on `admin_audit_log` both fail with `audit_log_is_append_only`; a staff member's token carries `user_role` (decode it at jwt.io). Members' sign-in with the hook on was confirmed on 2026-10-31.
- [ ] **Admin app, with a throwaway member account** (both admin logins and their QR setup worked on 2026-11-03):
  - A second sign-in asks only for the code. A non-staff email is signed straight out.
  - Report a throwaway account from another one. The report shows up on the Dashboard and in Reports with its messages, and closing it needs a reason.
  - **Warn:** the member sees the notification with your message.
  - **Suspend** for a day: their open chats show "This chat has ended" for the other person, signing in shows the suspended message, and they get no new matches. **Lift** lets them sign in again.
  - **Ban:** the same, until lifted.
  - Every step shows up in the Audit log.

## Cleanup in production

- [ ] **QA accounts from block/report testing:** TestAlice and TestBob (`josiah.prince03+lovkeytesta@gmail.com`, `josiah.prince03+lovkeytestb@gmail.com`). Sign in as each and use Settings → Delete account.
- [ ] **Their test report**, which deliberately survives account deletion now. Remove it in the SQL editor: `DELETE FROM public.reports WHERE details LIKE 'Test report - QA verification%';`

## Optional / decide later

- [ ] Ask existing users (who signed up before 2026-10-01) to accept the Terms and Privacy Policy. Today only new sign-ups tick the box.
- [ ] Stop removed users re-registering with a new email (would mean keeping a hash of their email).
- [ ] Users who haven't done daily onboarding since the vibe-id change (e.g. "Kate", last answered 2026-03-16) still have old `vibe1`/`vibe2` ids with no names, so their vibes can't be shown on Matches or Chats. They are still matched because candidates aren't filtered by onboarding date (rule 4). Decide whether to stop matching candidates whose answers are older than N days. Count them with: `SELECT count(*) FROM user_onboarding WHERE selected_memes_display IS NULL AND selected_memes::text ~ 'vibe[0-9]|meme[0-9]';`
- [ ] Three lockfiles are committed (`package-lock.json`, `bun.lock`, `bun.lockb`). Pick the one you deploy with and delete the others; `bun.lock` still lists a dependency I removed.
- [ ] `useUserDescription` and `MatchedUserDescriptionSection` fetch the same row in two different ways. Left alone because merging them touches realtime behaviour; worth doing as its own change.
- [ ] **Photo blur is only visual.** `get-signed-photo-url` hands out the full-resolution photo even before reveal, and the app blurs it with CSS, so anyone who copies the image address sees it clearly. A proper fix is to serve a tiny pre-blurred version until reveal (Supabase image transformations, Pro plan, or a blurred copy made at upload).
- [ ] Drop `profiles.personality_prompts` and its 5-point scoring term in `generate_matches_internal()` (UI for it was removed 2026-10-06; the column is now inert). Low value, needs a hand-applied migration.
- [ ] Photos that existed before 2026-10-21 were approved without a check. To check them, run `UPDATE public.user_photos SET moderation_status = 'pending' WHERE moderation_status = 'approved' AND moderated_at IS NULL;`. Each one is then hidden until its owner next opens the app and it passes.
- [ ] People with no approved photo can still be matched (their card just shows no photo). Decide whether `generate_matches_internal()` should skip them; it changes the matching rules.
- [ ] Rejected photos are decided by the AI alone. There's no human review queue or appeal button yet; the Terms tell people to contact support.
- [ ] "Pause my profile" (Bumble Snooze / Hinge Pause). Skipped because it changes the matching rules.
- [ ] Tighten DMARC on lovkey.app from `p=none` to `p=quarantine` after a few weeks of clean reports (Cloudflare DNS, the `_dmarc` TXT record).
- [ ] **Phone apps (App Store / Google Play), after the web launch.** Plan: wrap the same React code with Capacitor. Your side: Apple Developer ($99/year, a company needs a D-U-N-S number), Google Play ($25 once), a Mac or a cloud build service for iOS, an 18+ rating, the privacy policy URL on your domain, and a demo account for reviewers. Apple rejects plain website wrappers, so the first version adds push notifications for matches and messages, native location and a proper icon and splash screen. About 1–2 weeks of Claude's work; start it as its own task.
