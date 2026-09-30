# Hand in Hand

A **free**, **offline** and **private** Windows app for parents, teachers and specialists supporting children with special needs.

- Child profiles and a printable "All About Me" page
- IEP / 504 / EHCP / NDIS goals with quick data collection and progress charts
- Behavior log (before → behavior → after) with a pattern finder
- Daily home–school notebook
- Visual schedules, routines, first–then boards, full-screen show mode, visual timer
- Checklists for meetings, visits and transitions
- Printable progress reports for meetings
- Password encryption (AES-256), recovery key, auto-lock, daily automatic backups, encrypted share files for home ↔ school

📖 **[How to use it (with screenshots)](docs/USER_GUIDE.md)** · 🧭 **[Product spec and roadmap](docs/SPEC.md)**

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
src-tauri/            desktop wrapper (Tauri 2)
```

## Donations

Set your PayPal link in `src/lib/app.ts` (`DONATE_URL`). The "Support this project" button appears once it is set.
