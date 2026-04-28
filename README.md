# SolarCRM Website + Admin

Modern static solar installation website with Firebase-backed lead capture and an admin CRM view.

## What is included

- Public website sections: Home, About, Services, Projects/Gallery, FAQ, Contact
- Lead generation forms: quote request + contact inquiry
- Firebase integration for storing website leads
- Admin CRM page (`/admin`) to view and manage all submitted leads
- Responsive layout for desktop, tablet, and mobile

## Tech stack

- React + TypeScript + Vite
- Tailwind + shadcn/ui
- Firebase Analytics + Firestore

## Firebase configuration

Firebase is configured in `src/lib/firebase.ts` using:

- `projectId`: `solarproject-f1225`
- `measurementId`: `G-0PXV6G4HS5`

Leads are saved to:

- `quoteRequests`
- `contactInquiries`

## Local development

```sh
npm install
npm run dev
```

## Build

```sh
npm run build
```

## Routes

- `/` public solar website
- `/admin` admin CRM (lead management)

# solarcrmprojecct

## Admin login + Firestore rules setup

1. In Firebase Console, enable **Authentication > Sign-in method > Email/Password**.
2. Create at least one admin user in **Authentication > Users**.
3. Deploy `firestore.rules` so:
   - Website visitors can submit forms (`create`)
   - Only signed-in users can view/update leads in admin CRM
4. If forms get stuck at submitting, check:
   - Firestore database is created in project `solarproject-f1225`
   - Firestore rules are deployed
   - Browser network is not blocking Firebase requests
