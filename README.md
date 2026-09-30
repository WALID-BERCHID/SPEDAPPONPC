# Hand in Hand

A **free**, **offline** and **private** Windows app for parents, teachers and specialists supporting children with special needs.

**Track:** child profiles and "All About Me" page · IEP / 504 / EHCP / NDIS goals with data collection and charts · behavior log with pattern finder · daily home–school notebook · health log and appointments

**Support:** visual schedules with full-screen mode · social stories · talking board · reward charts · visual timer · calm corner

**Plan:** checklists · printable progress reports

**Together:** free community with groups, Ask-a-Specialist, template library, live sessions, points, levels, badges and verifiable certificates

**Private by design:** AES-256 encryption, recovery key, auto-lock, daily backups, encrypted home ↔ school share files

📖 **[How to use it (with screenshots)](docs/USER_GUIDE.md)** · 🌐 **[Switch on the community](docs/COMMUNITY_SETUP.md)** · 🧭 **[Product spec](docs/SPEC.md)**

![Today screen](docs/screenshots/03-today.png)

## Download

Every push builds a Windows installer on GitHub Actions: open **Actions → Build → latest run → Artifacts → HandInHand-Windows-installer**.
To publish a release, push a version tag: `git tag v0.1.0 && git push origin v0.1.0`. A draft release with the installers appears under **Releases**.

## Development

Requirements: Node.js 22+, Rust (stable), and on Windows the [Tauri prerequisites](https://tauri.app/start/prerequisites/).

```bash
npm install
npm run dev          # the app in a browser at http://localhost:1420 (data in IndexedDB)
npm run tauri dev    # the real desktop window
npm test             # unit tests
npm run tauri build  # installers in src-tauri/target/release/bundle/
```

In the browser dev build, run `loadDemo()` in the console (after creating a password) to fill the app with sample data.

## Project layout

```
src/lib/crypto.ts     encryption (password + recovery key wrap one data key)
src/lib/storage.ts    where the vault is saved (app-data folder / IndexedDB)
src/lib/store.ts      in-memory data, autosave, share-file merge
src/lib/schema.ts     data model, plan types per country
src/lib/i18n.tsx      US vs Commonwealth spelling, date formats
src/features/*        one file per screen
src/community/*       community client (live Supabase + preview), levels, privacy check
supabase/migrations/  community database with security rules
web/verify.html       public certificate check page (GitHub Pages)
src-tauri/            desktop wrapper (Tauri 2)
```

## Donations

Set your PayPal link in `src/lib/app.ts` (`DONATE_URL`). The "Support this project" button appears once it is set.
