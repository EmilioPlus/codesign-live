# Project Restructuring and Security Fixes

The goal is to improve the project structure by removing redundant files, consolidating the directory layout, and fixing security vulnerabilities related to exposed Firebase credentials.

## User Review Required

> [!CAUTION]
> The [Firebasekey.json](file:///d:/Trabajo%20de%20grados/codesign-live/server/Firebasekey.json) file is currently in the server root. This is a significant security risk if committed to a public repository. I plan to leave the file where it is (or move it to `server/src/config`) but create a `.gitignore` to ensure it is not tracked by Git. Alternatively, we can migrate it entirely to `.env`. I will proceed by adding a `.gitignore` file and moving the configuration to the proper folder structures. If the repository is public, you should **rotate (regenerate)** your Firebase private key immediately.

## Proposed Changes

### Server Structural & Security Updates
#### [NEW] `server/.gitignore`
- Add standard Node.js ignores (`node_modules`, `.env`) and specifically ignore `Firebasekey.json`.
#### [DELETE] `server/index.js`
- This is a redundant root entry point that only exposes a test `/guardar` endpoint. The real application runs from `server/src/index.js`.
#### [MODIFY] `server/config/firebase.js` -> `server/src/config/firebase.js`
- Move the firebase configuration inside the `src` directory to maintain a clean architecture. Update the path to `Firebasekey.json` accordingly.
#### [MODIFY] `server/src/controllers/streams.controller.js`
- Update the import path of `firebase.js` to reflect its new location.
#### [MODIFY] `server/src/controllers/auth.controller.js`
- Update the import path of `firebase.js` to reflect its new location.

### Client Structural Updates
#### [DELETE] `client/Firebase.html`
- Remove this unused test file that was connecting to the redundant `server/index.js`.

## Verification Plan
### Automated Tests
- Run `npm run dev` in the `server` directory to ensure the server starts correctly on port 4000 and connects to Firebase successfully without crashing.
- Run `npm run dev` in the `client` directory to ensure the Vite React app compiles correctly.
