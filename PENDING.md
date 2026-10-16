# Pending items

Open work that needs the owner. Claude reminds you of these (see `CLAUDE.md`). Remove an item once it's done.

_Last reviewed: 2026-10-16_

## Before launch (needs you)

- [ ] **Switch on phone and email verification (code is built, branch `feat/phone-email-verification`).** Until steps 1 and 2 are done, nobody can sign up, because sign-up now starts with an SMS code. Existing accounts are unaffected and still sign in with email and password.
  1. Apply `supabase/migrations/20261016120000_account_verification.sql` in the SQL editor.
  2. Supabase → Authentication → Sign In / Providers → **Phone**: turn it on, pick Twilio, and paste the Account SID, Auth Token and Message Service SID from your Twilio account. To test without real texts, add a test number and code under "Test Phone Numbers and OTPs" on the same page.
  3. Same page → **Email**: turn on **Confirm email**, and keep "Secure email change" on. Existing users were auto-confirmed, so this only affects new sign-ups.
  4. Authentication → Emails → Templates → **Change email address**: the app asks for a code, so the email must show one. Subject `Your LovKey code`, body `<p>Your LovKey code is <strong>{{ .Token }}</strong>. It expires in 1 hour.</p>`. (New users add their email after the phone, which Supabase counts as an email change.)
  5. Optional: Authentication → SMS template, e.g. `Your LovKey code is {{ .Code }}`.
- [ ] **Bot protection on SMS codes (CAPTCHA).** Anyone can ask Supabase to text a code to any number, and bots abuse that to run up SMS bills ("SMS pumping"). Before launch, turn on CAPTCHA (Authentication → Attack Protection, e.g. Cloudflare Turnstile, which is free) and keep the SMS rate limit low (Authentication → Rate Limits). Turnstile also needs a small change in `AuthScreen` to send the CAPTCHA token; ask Claude when you have the site key. In Twilio, limit SMS to the countries you launch in (Messaging → Settings → Geo permissions).
- [ ] **Photo verification.** Photos users upload need to be verified. Not done yet.
- [ ] **Age verification.** Users need to be verified so under-age people can't use the app. Not done yet.

- [ ] **Legal placeholders.** Fill in `LEGAL_OPERATOR`, `SUPPORT_EMAIL`, `GOVERNING_COUNTRY` and `HOSTING_REGION` at the top of `src/lib/legal.ts`. Until then the Terms and Privacy Policy show `[Company Name]` and similar, and Settings → Contact support emails a dummy address.
- [ ] **Password-reset redirect URL.** In Supabase → Authentication → URL Configuration → Redirect URLs, add `http://localhost:8080/**`, and later your live domain (e.g. `https://yourdomain/**`). Without it, "Forgot password?" emails open the wrong page.
- [ ] **Custom email provider (SMTP).** Supabase's built-in sender only allows a few emails an hour, so reset and sign-up emails will start failing once real users arrive. Set one up in Supabase → Authentication → Emails → SMTP settings.
- [ ] **Host the app over HTTPS** before launch. Browsers only share location on HTTPS or localhost. Easiest is Lovable → Publish (the repo is already linked); Vercel or Netlify also work. After hosting, add the live address to Supabase → Authentication → URL Configuration (Site URL and Redirect URLs).
- [ ] **Re-accept Terms and Privacy:** both were updated on 2026-10-07 (location rules), and the Privacy Policy again on 2026-10-16 (phone numbers, Twilio), so existing users are now behind on `TERMS_VERSION` / `PRIVACY_VERSION`. See the "Ask existing users" item below.

## Still to test end to end (use throwaway accounts)

- [ ] **Phone and email sign-up (after switching it on above):** Sign up → number → SMS code → email and password → emailed code → profile setup. Then sign out and sign in both ways: Phone tab with an SMS code, and Email tab with the password. Also check that closing the app between the SMS and email steps brings you back to the email step, that "Forgot password?" works for the new account, and that an existing (pre-2026-10-16) account still goes straight in.

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
- [ ] "Pause my profile" (Bumble Snooze / Hinge Pause). Skipped because it changes the matching rules.
