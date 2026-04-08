# FocusMute

FocusMute is a desktop utility for Windows that automatically mutes background apps and restores their audio when they return to the foreground. The project is built with `Tauri 2 + React + TypeScript + Rust`: Rust handles process detection and Windows audio session control, while React provides the desktop UI.

## Overview

### Goals

- Detect the current foreground window automatically
- Mute background processes that have active audio sessions
- Restore audio when an app returns to the foreground
- Support both whitelist and blacklist strategies
- Support launch at startup
- Support minimize to tray
- Show muted processes and runtime logs in real time
- Display process icons when available

### Tech Stack

- Desktop shell: `Tauri 2`
- Frontend: `React 19 + TypeScript + Zustand + Framer Motion`
- Backend: `Rust`
- System integrations:
  - Process enumeration: `sysinfo`
  - Foreground window detection: `Win32 GetForegroundWindow / GetWindowThreadProcessId`
  - Audio session control: `Windows Core Audio API (IAudioSessionManager2 / ISimpleAudioVolume)`
  - Launch at startup: `tauri-plugin-autostart`
  - System tray: `Tauri tray-icon`

## How It Works

- A Rust background engine polls the system and keeps track of:
  - the foreground process ID
  - the current process list
  - the active Windows audio sessions
- Based on the configured strategy, FocusMute decides which background processes should be muted:
  - Whitelist mode: mute all background audio processes except those in the whitelist
  - Blacklist mode: mute only background audio processes that match the blacklist
- To avoid overriding the user's manual choices, the app only restores processes that it muted itself
- State updates are pushed to the frontend through Tauri events, so the UI updates live

## UI Features

- Overview dashboard with status cards
- Process table with runtime state
- Per-process audio, foreground, and policy status
- Whitelist and blacklist management
- Toggles for auto mute, startup launch, and minimize to tray
- Light and dark themes
- Real-time log panel

## Project Structure

```text
FocusMute/
├─ src/                          React frontend
│  ├─ components/                UI modules
│  ├─ hooks/                     Tauri event subscriptions
│  ├─ lib/                       Frontend utility functions
│  ├─ stores/                    Zustand state store
│  ├─ App.tsx                    Main window UI
│  ├─ index.css                  Global styles
│  └─ types.ts                   Shared frontend/backend types
├─ src-tauri/                    Rust and Tauri desktop layer
│  ├─ capabilities/              Tauri capability declarations
│  ├─ icons/                     App icons
│  ├─ src/
│  │  ├─ audio.rs                Windows audio session control
│  │  ├─ commands.rs             Tauri commands
│  │  ├─ config.rs               Config loading and normalization
│  │  ├─ engine.rs               Background mute engine
│  │  ├─ main.rs                 Tauri entry point
│  │  ├─ models.rs               Serializable models
│  │  ├─ state.rs                Shared state and logs
│  │  └─ system.rs               Foreground window and process inspection
│  ├─ build.rs
│  └─ tauri.conf.json
├─ package.json
└─ vite.config.ts
```

## Requirements

- Windows 10 or Windows 11
- Node.js 22+
- Rust 1.94+
- Microsoft WebView2 Runtime

Python on this machine uses the `conda base` environment, but this project does not depend on Python for its core workflow.

## Install Dependencies

```powershell
npm install
```

## Run in Development

```powershell
npm run tauri dev
```

## Build

```powershell
npm run tauri build
```

Build artifacts are generated under:

```text
src-tauri/target/release/bundle/
```

If you only want to verify packaging locally in debug mode:

```powershell
npm run tauri build -- --debug
```

## Verified Commands

The current project has been validated with:

```powershell
npm run build
cargo check
npm run tauri build
```

## Current Implementation Status

- Automatic muting for background audio processes
- Automatic restore when an app returns to the foreground
- Whitelist and blacklist mode switching
- Launch at startup toggle
- Minimize-to-tray behavior and tray restore
- Tray icon state updates based on auto-mute state
- Real-time process and log views
- Process icon extraction and display
- Light and dark theme support
- Custom title bar behavior for minimize, maximize, and window dragging

## Possible Future Improvements

- More advanced matching rules, such as window title or path-based matching
- Configurable polling intervals
- Configuration import and export
- First-run onboarding flow
- Better packaging and release automation

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE) for details.
