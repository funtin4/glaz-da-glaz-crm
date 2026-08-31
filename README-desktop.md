# Desktop build for Windows

This repository contains a static HTML CRM and a lightweight Electron wrapper.

## Development run

```bash
npm install
npm start
```

## Build a 32-bit Windows portable app

```bash
npm run dist:win32
```

Electron is pinned to the newest stable release found with a published
`win32-ia32` runtime archive. Newer Electron releases may be available for
64-bit Windows only, so updating Electron should be followed by a test build of
`npm run dist:win32`.

The default 32-bit build creates a Windows `ia32` portable executable in
`dist/`.

## Build a 32-bit Windows installer

```bash
npm run dist:win32:installer
```

On Linux/macOS, the NSIS installer target may require Wine/Mono packages in the
build environment. If the installer target fails because of missing Wine
tooling, run it on a Windows machine with Node.js:

```powershell
npm install
npm run dist:win32:installer
```

## Data storage

The CRM still stores data locally through browser storage on the current
computer. Before moving to another machine or reinstalling the desktop app, use
the in-app database export button and keep the JSON backup.
