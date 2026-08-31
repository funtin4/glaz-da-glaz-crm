# Desktop build for Windows

This repository contains a static HTML CRM and a lightweight Electron wrapper.

## Development run

```bash
npm install
npm start
```

## Build a 32-bit Windows app

```bash
npm run dist:win32
```

The build is configured to create Windows `ia32` artifacts in `dist/`:

- portable executable;
- NSIS installer.

On Linux/macOS, Windows builds may require Wine/Mono packages in the build
environment. If the installer target fails because of missing Wine tooling,
the Electron configuration can still be used on a Windows machine with Node.js:

```powershell
npm install
npm run dist:win32
```

## Data storage

The CRM still stores data locally through browser storage on the current
computer. Before moving to another machine or reinstalling the desktop app, use
the in-app database export button and keep the JSON backup.
