# AGENTS.md

## Project purpose
This repository contains a Hebrew RTL building management / homeowners committee application.
It is intended to run as a static client-side web app on GitHub Pages.
Future migration to Android wrapper / Play Store is a goal, but the current code must remain static-host friendly.

## Core product rules
- The app language is Hebrew.
- The layout direction is RTL.
- UI text must remain readable and explicit.
- Prefer visible controls over hidden interactions.
- Do not add a backend unless explicitly requested.
- Do not introduce dependencies that break GitHub Pages static deployment.

## Authentication and roles
There are three explicit modes:
- guest
- tenant
- admin

### Required auth UX
- A persistent auth area must exist in the header.
- The auth area must always make it clear which mode is active.
- The auth area must provide obvious actions for:
  - tenant login
  - admin login
  - logout
- Do not hide role switching behind unclear UI.

### Admin credentials
- username: `admin`
- password: `admin`

### Tenant login
- No password required.
- Tenant must provide apartment identifier or display name.
- The connected tenant identity should be visible after login.

### Persistence
- Auth state should be stored in `localStorage`.
- Tenant display name / apartment identifier should be stored when relevant.

## Permissions
### Guest
- Can view only non-sensitive public content.
- Cannot perform admin actions.
- Cannot perform tenant-specific actions that require identity.

### Tenant
- Can open service requests.
- Can view announcements.
- Can view own payment state if the app supports it.
- Cannot access admin management actions.

### Admin
- Can manage tenants.
- Can manage payments.
- Can publish announcements.
- Can close, reopen, or manage service requests.

## Implementation preferences
- Prefer simple client-side JavaScript.
- Reuse existing structures before adding new abstractions.
- Keep code understandable and easy to maintain.
- Keep styling consistent with the existing app.
- Avoid overengineering.

## UI expectations
- Keep Hebrew text explicit and natural.
- Keep RTL rendering correct.
- Important actions must be visible without guesswork.
- Every user should immediately understand:
  - who is logged in
  - what role is active
  - how to switch role
  - how to log out

## Deployment constraints
- The app must continue to work on GitHub Pages.
- Do not require server-side rendering.
- Do not require secret environment variables for core UI behavior.
- PWA behavior is allowed if it remains static-host compatible.

## Validation requirements
Before finishing any task:
1. Check for syntax errors in modified JavaScript files.
2. Verify that auth controls are visibly rendered in the header.
3. Verify guest / tenant / admin transitions.
4. Verify logout behavior.
5. Verify admin-only sections are hidden or blocked for non-admin users.
6. Summarize exact files changed and exact user-visible behavior.

## Response expectations for coding tasks
When completing a task:
- change the real code, not just documentation
- keep the summary concrete
- list validations actually performed
- do not claim UI behavior that was not implemented and verified
