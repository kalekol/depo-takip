# Cross-Platform (Desktop, iOS, Android) & Camera Optimization Plan

1-2 sentence summary: This update enhances the application for Desktop, iOS Safari, and Android Chrome browsers by adding PWA (Add to Home Screen) installability, smart mobile/desktop camera selection, flash torch controls, and responsive touch-first UI optimizations.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following choices were confirmed during Phase 1 clarification:
> - **Confirmed Focus**: PWA installation capabilities (Add to Home Screen), camera facing & flash controls, and mobile touch UI responsiveness.
> - **Confirmed Camera Strategy**: Default to rear camera (`environment`) on mobile devices (iOS/Android), default webcam on Desktop, and provide an easy camera switcher in the scanning modal.

---

## 1. Overview & Core Concept

- **What It Does**: Optimizes the web app across desktop browsers, iOS Safari/Chrome, and Android Chrome. Provides native-like PWA installation, seamless camera scanning with automatic device detection, torch flash toggle, and responsive touch ergonomics.
- **Target Audience / Persona**: Warehouse staff scanning barcodes on mobile phones (iPhones, Android devices) and desktop PC operators managing stock.
- **Key Value**: Native app-like performance on mobile home screens without app store downloads, reliable camera scanning on any device, and responsive touch targets.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **PWA Home Screen Installation**: Mobile and desktop users see an "Uygulamayı Yükle" button in the Navbar. On iOS, a friendly step-by-step guide is shown ("Paylaş" -> "Ana Ekrana Ekle").
  2. **Smart QuickScan Camera**: 
     - On iPhones/Android phones: Starts rear camera automatically in `100dvh` responsive modal.
     - On Desktop: Starts standard webcam cleanly.
     - Quick camera selector allows switching between cameras (e.g., Ultra-Wide vs Main camera on multi-lens mobile phones).
     - Flash button toggles torch mode with feedback.
  3. **Touch-First Mobile Ergonomics**: Touch hitboxes $\ge 44\text{px}$, responsive modal sizing, and proper iOS Safari viewport height handling (`100dvh`).
- **Visual Identity & Theme**:
  - Clean, high-contrast dark/light UI with smooth backdrop blurs (`backdrop-blur-md`).
  - Mobile touch targets and clear status badges.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Vite PWA Integration (`vite-plugin-pwa`)**:
  - *Chosen Approach*: Configure `vite-plugin-pwa` with auto-update, manifest file, mobile viewports, and custom PWA install hook (`usePWAInstall`).
  - *Why*: Enables offline precaching, standalone app display, and native installation on iOS and Android.
- **Decision 2: Mobile vs Desktop Camera Constraints**:
  - *Chosen Approach*: Detect device type dynamically. Request `facingMode: 'environment'` on mobile devices and device-specific constraints on desktop, while retaining fallback enumeration.
  - *Why*: Prevents front-selfie camera accidental launch on mobile phones while ensuring instant webcam initialization on desktop.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

```
┌─────────────────────────────────────────────────────────┐
│                    App Architecture                     │
├────────────────────────────┬────────────────────────────┤
│   PWA & Viewport Layer     │    Camera Scanning Engine  │
│ - Manifest & SW (Vite PWA) │ - Auto Facing (Env / User) │
│ - iOS Safari Meta Tags     │ - Camera Switcher Dropdown │
│ - Install Prompt Hook      │ - Torch Flash Toggle       │
│ - 100dvh Safe Viewports    │ - Dual ZXing + Native      │
└────────────────────────────┴────────────────────────────┘
```

### Proposed Changes

1. **PWA Setup & Manifest (`vite.config.ts`, `index.html`)**:
   - Install `vite-plugin-pwa`.
   - Update `vite.config.ts` with `VitePWA` plugin, manifest, theme colors, icons.
   - Update `index.html` with viewport meta tags (`viewport-fit=cover`, `apple-mobile-web-app-capable`).

2. **PWA Install Hook & UI (`src/lib/usePWAInstall.ts`, `src/components/Navbar.tsx`)**:
   - Implement `usePWAInstall` hook handling `beforeinstallprompt` and iOS Safari installation modal guide.
   - Mount "Uygulamayı Yükle" button in Navbar.

3. **Camera & Device Optimization (`src/lib/barcodeScanner.ts`, `src/components/QuickScanModal.tsx`)**:
   - Enhance camera device detection (detecting mobile vs desktop).
   - Improve camera switching, torch controls, and responsive video container sizing (`100dvh`, touch targets $\ge 44\text{px}$).
