# Pending items

Open work that needs the owner. Claude reminds you of these (see `CLAUDE.md`). Remove an item once it's done.

_Last reviewed: 2026-10-01_

## Before launch (needs you)

- [ ] **Legal placeholders.** Fill in `LEGAL_OPERATOR`, `SUPPORT_EMAIL`, `GOVERNING_COUNTRY` and `HOSTING_REGION` at the top of `src/lib/legal.ts`. Until then the Terms and Privacy Policy show `[Company Name]` and similar, and Settings → Contact support emails a dummy address.
- [ ] **Password-reset redirect URL.** In Supabase → Authentication → URL Configuration → Redirect URLs, add `http://localhost:8080/**`, and later your live domain (e.g. `https://yourdomain/**`). Without it, "Forgot password?" emails open the wrong page.
- [ ] **Custom email provider (SMTP).** Supabase's built-in sender only allows a few emails an hour, so reset and sign-up emails will start failing once real users arrive. Set one up in Supabase → Authentication → Emails → SMTP settings.

## Still to test end to end (use throwaway accounts)

- [ ] **Download my data:** the zip downloads with `data.json`, photos and `README.txt`.
- [ ] **Delete account:** profile, photos and chats disappear for both people, and any report about the deleted user is still in `reports`.
- [ ] **Forgot password:** the email arrives, the link opens `/reset-password`, the new password works and other devices get signed out.
- [ ] **6-chat cap:** the "paused" card on Matches when a user has 6 active chats (unverified since 2026-09-28).
- [ ] **Hourly expiry notifications:** `match_expired` (24h) and `chat_expired` (48h inactivity) reach both users (unverified since 2026-09-28).
- [ ] **Photo reveal:** both people choose "reveal" and photos unblur (only the "wait" path has been tested).

## Cleanup in production

- [ ] **QA accounts from block/report testing:** TestAlice and TestBob (`josiah.prince03+lovkeytesta@gmail.com`, `josiah.prince03+lovkeytestb@gmail.com`). Sign in as each and use Settings → Delete account.
- [ ] **Their test report**, which deliberately survives account deletion now. Remove it in the SQL editor: `DELETE FROM public.reports WHERE details LIKE 'Test report - QA verification%';`

## Optional / decide later

- [ ] Ask existing users (who signed up before 2026-10-01) to accept the Terms and Privacy Policy. Today only new sign-ups tick the box.
- [ ] Stop removed users re-registering with a new email (would mean keeping a hash of their email).
- [ ] "Pause my profile" (Bumble Snooze / Hinge Pause). Skipped because it changes the matching rules.
