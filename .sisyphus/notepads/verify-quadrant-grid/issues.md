## Issues Encountered
- Playwright in headless mode (without proper permissions) blocks clipboard write operations, causing 'NotAllowedError' when clicking the Copy button. This is a test environment limitation, not a bug in the application.
- Tailwind 4 uses OKLCH color space by default, so background color checks should account for oklch() values instead of just rgb().
