# Currency Converter (React + TypeScript + SCSS Modules)

Small single-page currency converter using VATComply API with caching and offline support.

## Features

- Live conversion while typing (debounced).
- Currency selection modal with search, keyboard support (↑/↓/Enter/Esc).
- Swap From/To.
- Caching of last successful rates in `localStorage`.
- Offline mode: uses cached rates and indicates timestamp.
- Manual refresh button (throttled).
- Responsive: mobile (≤480px) and desktop (≥1024px).
- Strict TypeScript and typed API response.

## Tech

- Vite + React + TypeScript
- SCSS Modules
- Service worker (basic) for caching assets (optional)

## Setup

1. Install:
    ```bash
    npm install
    ```
