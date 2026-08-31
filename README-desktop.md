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

Electron is pinned to `22.3.27` for Windows 8.1 compatibility. Electron 22 is
the final major Electron release line that supports Windows 7, Windows 8, and
Windows 8.1; Electron 23 and newer require Windows 10 or newer.

This is a legacy compatibility build. Electron 22 is end-of-life, so npm may
report vulnerabilities in its dependency tree. Updating Electron should only be
done if support for Windows 8.1 is no longer required, and it must be followed
by a test build of `npm run dist:win32`.

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
