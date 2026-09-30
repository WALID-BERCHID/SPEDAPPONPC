# Hand in Hand — Product Spec

> Working name. It lives in one constant (`src/lib/app.ts`), so it is easy to change.

A PC app for parents, teachers and specialists who support children with special needs.
It is **completely free, works offline, and keeps the child's data private on the computer**.
People who want to help can donate through PayPal. Around it sits a **free online community** where families, teachers and volunteer specialists help each other.

---

## 1. Decisions taken

| Topic | Decision | Why |
|---|---|---|
| Markets | **USA, Canada, UK, Australia** | Biggest English-speaking markets; families already pay for special-needs apps |
| Language | English in v1, with US or UK/Commonwealth spelling and date format picked from the country ("behavior"/"behaviour", MM/DD vs DD/MM) | One codebase; more languages (Spanish, French for Quebec) later as one file each in `src/locales/` |
| Plan types | IEP and 504 (US), IEP / Plan d'intervention (Canada), EHCP / IEP / IDP (UK), NDIS plan / ILP (Australia), or informal home goals | Every goal records which plan it belongs to |
| Platform | Windows 10/11 first; macOS from the same code next | Windows dominates schools; many families use Macs, so macOS follows (needs an Apple developer account, $99/year) |
| Technology | Tauri 2 + React + TypeScript | Small installer (~10 MB), low RAM, good on old school PCs |
| Private data | Stays on the PC, encrypted with the user's password (AES-256) | Health and disability data is very sensitive; nothing to leak from a server |
| Business model | **Everything free.** Optional PayPal donations ("Support this project" button) | No ads, no subscriptions, no data selling, ever |
| Diagnoses | Works for any need; nothing assumes one diagnosis | "Whole community" |

## 2. The ecosystem

```
┌──────────────────────────────┐         ┌──────────────────────────────────┐
│  DESKTOP APP (free)          │         │  COMMUNITY HUB (free, online)     │
│  offline · private · local   │ ◄────►  │  optional · separate account      │
│                              │ opt-in  │                                   │
│  child profiles, goals,      │         │  forums, Ask-a-Specialist,        │
│  behavior, daily notebook,   │         │  template library, points,        │
│  visual supports, reports    │         │  certificates, events, directory  │
└──────────────────────────────┘         └──────────────────────────────────┘
      Child records never go online.        Only what a person chooses to post.
```

### 2.1 Desktop app (private)

Roles: **parent**, **teacher**, **specialist** (therapist, aide). The child uses "show mode" / child mode.

| # | Module | Version |
|---|---|---|
| 1 | Child profiles + printable "All About Me" page | v1 ✅ |
| 2 | Goals + quick data collection (percent, count, duration, 1–5 rating, prompt level) + progress charts | v1 ✅ |
| 3 | Behavior log (before → behavior → after), intensity, setting + pattern finder | v1 ✅ |
| 4 | Daily home–school notebook (mood, sleep, meals, highlights, concerns, message) | v1 ✅ |
| 5 | Visual schedules, first–then boards, step-by-step routines, full-screen show mode, visual timer, read-aloud | v1 ✅ |
| 6 | Printable progress report for meetings (print or "Save as PDF") | v1 ✅ |
| 7 | Encrypted backup/restore; encrypted share file to exchange one child's data between home and school | v1 ✅ |
| 8 | Password + recovery key, auto-lock, themes (light/dark/high contrast), readable font, text size | v1 ✅ |
| 9 | "Support this project" PayPal button (hidden until the link is set in `src/lib/app.ts`) | v1 ✅ |
| 10 | Social stories builder, simple talking board (AAC-lite) | v1.2 |
| 11 | Locked child mode (calm-down corner, feelings check-in, simple learning games) | v1.2 |
| 12 | Health logs (medicine, seizures, sleep), appointments & reminders, document vault | v1.3 |
| 13 | Teacher tools: caseload dashboard, group data sessions, substitute sheet | v1.3 |
| 14 | Transition-to-adulthood life skills | later |

### 2.2 Community hub (free, online)

- **Groups and forums** by language, region, age and need (not by label only).
- **Ask a Specialist**: public, anonymous Q&A answered by **verified volunteer specialists** (SLPs / speech therapists, OTs, BCBAs, psychologists, special-ed teachers, paediatricians). Later: free live "office hours" and group webinars.
- **Template library**: visual schedules, routines, goal banks shared by the community; one click imports them into the desktop app.
- **Directory**: charities, parent groups and services by state/province/region.
- **Academy** (later): short parent courses with completion certificates.

### 2.3 Points, levels and certificates (for volunteers *and* parents)

People who give their time are recognised, never paid.

| Action | Points |
|---|---|
| Answer marked helpful by the asker | +15 |
| Each "helpful" vote on an answer | +2 |
| Host a live session / webinar (confirmed by attendees) | +50 |
| Shared template imported by others (per 10 imports) | +5 |
| Mentor a new parent (confirmed by both sides) | +20 |
| Translate or review content | +10 |
| Moderation actions confirmed by admins | +3 |

- **Levels**: Seed → Helper → Guide → Mentor → Pillar. Levels unlock things like hosting sessions and moderating.
- **Certificates** (PDF): "Volunteer contribution certificate" with hours, answers, sessions and a **unique ID + QR code** that anyone can check on the website. Useful on a CV, for continuing-education files, and for students in training.
- **Parents**: badges such as "Parent Mentor", "Template Maker", course certificates, and a thank-you certificate for active helpers.
- **Rewards without money**: featured profile, "Pillar" hall of fame, reference letters, partner rewards from charities and training providers.
- **Anti-cheating**: points mostly come from *other people's* confirmations, with daily caps. Admins can reverse points. Points never give medical authority; only verified credentials do.

### 2.4 Safety and trust (must exist before launch)

- Specialists upload credentials; an admin checks them before the "Verified" badge.
- Clear notice: community answers are guidance, not diagnosis; emergencies go to local services.
- Posting rules: no child full names, faces or school names. The app warns before sharing and strips names from exported templates.
- Report button, volunteer moderators, word filters, bans. Adults only (18+).
- Legal: US (COPPA → adults only, state privacy laws), Canada (PIPEDA), UK (UK GDPR + ICO registration, ~£40/year), Australia (Privacy Act 1988). Terms of use and privacy policy before launch.
- Emergency notice shows the right number for the user's country: 911 (US/Canada), 999 (UK), 000 (Australia).
- Certificates record volunteer contribution. They are **not** continuing-education credits (ASHA/BACB CEUs need accreditation, which can come later).

### 2.5 Community technology (proposal)

- **Supabase** (open-source Postgres + login + storage + realtime) for the community backend. Free tier to start; can be self-hosted later so there is no lock-in.
- A small website for: buying the app, verifying certificates (`/verify/<id>`), and reading the community from a browser.
- The desktop app talks to the community only when the user opens the Community tab and signs in.

## 3. Money

### 3.1 Free for everyone
- No price, no editions, no licence keys. Every feature is free for every family, teacher and specialist.
- A **"Support this project"** button opens the PayPal page. Donations pay for the community server, the domain and code signing.
- Other places to accept donations later: GitHub Sponsors, Ko-fi (both accept PayPal and cards).
- Donations to a person (not a registered charity) are not tax-deductible for the donor. The app says "support", not "tax-deductible donation".
- **Suggestion:** publish the code as open source (the repo is already public). It proves the privacy promise, invites volunteer developers, and qualifies for free code signing (SignPath Foundation) and free hosting programs.
- Free distribution: GitHub Releases (installer download) and the Microsoft Store (free listing for individuals; the Store signs the app).

### 3.2 Running costs outside Claude credits
| Item | Cost |
|---|---|
| Domain name | ~$10–15 / year |
| Supabase | $0 at start, ~$25 / month when the community grows |
| Windows code signing (removes the "unknown publisher" warning) | Microsoft Store: included · SignPath (open source): free · Azure Trusted Signing: ~$10 / month |
| Email sending | free tier (e.g. Resend) at start |

### 3.3 Claude credit budget ($97 total)
| Phase | Scope | Target |
|---|---|---|
| 1 | Spec + desktop v1 (this commit) | ≤ $15 |
| 2 | Fixes from your testing, installer polish, first release | ≤ $15 |
| 3 | Community hub v1: accounts, forums, Ask-a-Specialist, template library | ≤ $30 |
| 4 | Points, levels, certificates with QR verification | ≤ $20 |
| Reserve | Bug fixes and small requests | ~$17 |

## 4. Technical design (desktop)

- `src/lib/crypto.ts`: a random 256-bit data key encrypts everything (AES-GCM). That key is stored twice, locked by the **password** and by a **recovery key** (PBKDF2-SHA256, 600k rounds). Changing the password only re-locks the key.
- `src/lib/storage.ts`: in the desktop app the encrypted vault lives in the app-data folder with rolling automatic backups. In a browser (development/demo) it lives in IndexedDB.
- `src/lib/store.ts`: all data in memory while unlocked, saved (encrypted) automatically a moment after each change. Auto-lock clears it from memory.
- `src/lib/schema.ts`: the data model. Every record has `id`, `createdAt`, `updatedAt` so share files can be merged (newest wins).
- `src/locales/*.ts`: one file per language. The layout uses direction-neutral CSS, so a right-to-left language can be added later.
- Printing uses the system print dialog. Windows includes "Microsoft Print to PDF".
- Read-aloud uses the voices installed in Windows (no internet needed).

## 5. Pictures and names to avoid
- **ARASAAC** pictograms (the best free set) are licensed for non-commercial use. A free app fits that; because donations are accepted, confirm with ARASAAC before bundling them. v1 uses emoji and the user's own photos. **Mulberry Symbols** and **OpenMoji** (CC BY-SA) can be added later with attribution.
- "Zones of Regulation" and "PECS" are trademarks, so the app uses generic words ("feelings check-in", "picture exchange").
