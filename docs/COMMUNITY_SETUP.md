# Switching on the live community

Until these steps are done, the app's **Community** tab offers a *preview* with sample posts.
Everything here uses free plans. It takes about 30–45 minutes, and no programming is needed.

## 1. Create the free server (Supabase)

1. Go to **supabase.com**, then **Start your project** and sign up (GitHub login is easiest).
2. **New project**
   - Name: `hand-in-hand`
   - Database password: click **Generate** and keep it somewhere safe
   - Region: pick the one closest to most users (e.g. *East US* for North America, *London* for the UK, *Sydney* for Australia)
3. Wait about 2 minutes while it starts.

## 2. Create the community database

1. In the left menu open **SQL Editor**, then **New query**.
2. Open the file `supabase/migrations/001_community.sql` from this repository, copy **all** of it, and paste it in.
3. Click **Run**. You should see *"Success. No rows returned"*.

This creates the groups, posts, replies, helpful votes, points, levels, certificates, template library, live sessions, specialist verification and moderation, all with security rules. Members can only change their own things, and nobody can give themselves points.

## 3. Turn on email sign-in with a 6-digit code

1. **Authentication**, then **Sign In / Providers**, then **Email**: make sure it's **enabled**.
2. **Authentication**, then **Emails** (Email Templates), then **Magic Link**. Replace the message with:

   ```html
   <h2>Your Hand in Hand code</h2>
   <p>Enter this code in the app to sign in to the community:</p>
   <p style="font-size:28px;letter-spacing:6px"><strong>{{ .Token }}</strong></p>
   <p>If you didn't ask for this, you can ignore this email.</p>
   ```
3. Do the same for **Confirm signup** (new members get this one first).
4. **Recommended:** the built-in email service only sends a few emails per hour. For real use, set up free custom email:
   **Authentication**, then **Emails**, then **SMTP Settings**, using a free account at resend.com or brevo.com.

## 4. Connect the app

1. **Project Settings**, then **API**. Copy:
   - **Project URL** (looks like `https://abcd1234.supabase.co`)
   - **anon public** key (a long text starting with `eyJ…`). This key is *meant* to be public; the security rules protect the data.
2. Put both in **two** places:
   - `src/lib/app.ts`: `COMMUNITY_URL` and `COMMUNITY_KEY`
   - `web/config.js`: `url` and `key`
3. Commit and push. GitHub Actions builds a new Windows installer with the community switched on.

## 5. Make yourself the admin

1. Install the new version, open **Community**, and join with your email.
2. In Supabase, open the **SQL Editor** and run (use the name you chose):

   ```sql
   update profiles set is_admin = true, is_moderator = true where display_name = 'Walid';
   ```
3. Restart the app. **Community → Rewards** now shows **Reports to review** and **Specialist requests**.

To add volunteer moderators later:

```sql
update profiles set is_moderator = true where display_name = 'Their name';
```

To confirm a live session took place (gives the host 50 points and volunteer hours), a moderator runs:

```sql
select complete_event('<event id>');
```

## 6. Publish the certificate check page

1. On GitHub, open the repository, then **Settings**, then **Pages**, and under **Source** choose **GitHub Actions**.
2. Once the code is on the `main` branch, the page appears at
   `https://walid-berchid.github.io/SPEDAPPONPC/verify.html`.
   The QR code on every certificate points there (set in `VERIFY_URL` in `src/lib/app.ts`).

## 7. Checking specialists

When someone asks to be verified, you'll see their profession, registration number and issuing body. Check them on the official public register:

| Country | Where to check |
|---|---|
| USA | ASHA ProFind (SLPs), state licensing boards, BACB certificant registry (BCBAs) |
| Canada | Provincial college registers (e.g. CASLPO in Ontario, OEQ in Quebec) |
| UK | HCPC register (SLTs, OTs, psychologists), GMC (doctors) |
| Australia | AHPRA register, Speech Pathology Australia |

Approve only when the name and number match.

## Before launch: legal checklist

- A **privacy policy** and **community rules** page (the rules shown in the app are a start).
- **UK:** register with the ICO (data protection fee, about £40–60 per year).
- **Adults only (18+)**, which is already in the join rules and keeps you out of US COPPA rules.
- Free Supabase projects **pause after 7 days without activity**. Open the community once a week, or upgrade (US$25/month) when it grows.

## Costs

| Item | Cost |
|---|---|
| Supabase | Free (up to 50,000 monthly members, 500 MB) |
| Email (Resend/Brevo) | Free tier |
| GitHub Pages | Free |
| Domain name (optional) | ~$12/year |
