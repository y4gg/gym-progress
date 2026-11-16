# Gym Progress logo

The G uses the broad shape of a weight plate. The arrow points upward through its open corner.

- `logo.svg` and `logo.png`: dark wordmark, transparent background.
- `logo-light.svg` and `logo-light.png`: white wordmark for dark backgrounds.
- `mark.svg` and `mark-light.svg`: standalone symbol, with 1024 px PNG copies.
- `app-icon.svg` and `app-icon.png`: square app icon with a solid background, 1024 px PNG.
- `preview.svg` and `preview.png`: presentation sheet.

All SVG lettering is outlined, so no font installation or network request is needed. The wordmark uses Manrope Bold with adjusted spacing. Manrope is by Mikhail Sharanda and is available under the SIL Open Font License.

Colors: ink `#171917`, paper `#F5F5F0`, white `#FFFFFF`. Use the standalone mark at 24 px and above; keep the supplied clear space.

The mobile menu, desktop sidebar, and onboarding header use the standalone mark in `components/app-logo.tsx`, inheriting the text color for light and dark themes. Browser and installed-app icons are exported from `app-icon.svg`:

- `app/icon.svg`: rounded tile for SVG favicons.
- `app/favicon.ico`: 16, 32, and 48 px fallback favicon.
- `app/apple-icon.png`: 180 px Apple touch icon.
- `public/icons/icon.svg` and `apple-touch-icon.png`: copies of the app icons for the metadata and offline cache URLs.
- `public/icons/icon-192.png` and `icon-512.png`: standard PWA icons.
- `public/icons/icon-maskable-512.png`: smaller mark inside the central safe circle for home-screen masks.
