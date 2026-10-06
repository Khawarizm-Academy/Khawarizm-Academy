## Development Notes (Handwritten)

### 📌 Localization & State Architecture
- **Concept**:
  - All internal state, navigation keys, and domain roots in code are now **English keys** (e.g., `'home'`, `'courses'`, `'available'`, `'fully_funded'`).
  - At the very last layer (UI presentation), we convert them back to **Arabic** for display.
- **Implementation**:
  - Powered by [`localization.ts`](./frontend/src/shared/lib/localization.ts).
  - Quick helpers:
    - `toArabic(category, key)`: Direct lookup for actions, search filters, and statuses.
    - `toArabicNav(key)`: Converts English tab IDs into Arabic labels.
    - `convertKeyToAr(key)`: Universal fallback converter.
- **Rule of Thumb**:
  - Never use Arabic strings as state or logic keys anymore; everything stays clean English under the hood.

## Refactors

### Routes
- **Concept**:
  - Now: All Routes Takes in if Conditions and Need to add every new route into this Root File and Make if condition
  - Need to be: Remove All if Conditions and make an automated process to handle Paths and URLs
- **Implementation**:
  - Powered by [`RootLayout.tsx`](./frontend/src/app/layouts/RootLayout.tsx).