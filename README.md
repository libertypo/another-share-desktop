# another share extension

A native-feeling, privacy-focused Firefox extension to share articles and selected text with a single click.

## Features
- **Firefox Proton Design**: Seamlessly blends with the Firefox UI, supporting both Light and Dark themes.
- **Reader Mode Sharing**: A toggle to share links specifically formatted for Firefox's native Reader View.
- **Privacy & URL Cleaning**: Automatically strips tracking parameters (UTM, fbclid, etc.) before sharing or copying.
- **Highlighted Text Sharing**: Select text on any page to include it as a quote in your shares.
- **Smart Text Extraction**: Download a clutter-free version of any article as a `.txt` file, automatically stripping ads and navigation.
- **Review Workflow**: Preview your screenshots before saving or printing to ensure you captured exactly what you needed.
- **Save & Print**: Choose between PNG/JPEG formats or use the integrated Print/PDF facility.
- **Full-Page Capture**: Automatic scrolling capture to grab long articles in a single high-res image.
- **Customizable Grid**: Reorder or hide platforms in the settings to prioritize your favorite services.
- **Custom Service Templates**: Add support for self-hosted instances (Mastodon, link shorteners, etc.) using custom URL templates.
- **Context Menu Integration**: Right-click any selection or page area to share instantly.
- **Platform Support**: WhatsApp, Telegram, Bluesky, Mastodon, X, LinkedIn, Facebook, Reddit, Email, and Copy Link.

## Permissions Explained
This extension follows a **Minimum Viable Permissions** philosophy. Each permission is audited to ensure it supports our **Zero Data Collection** policy.

- **`activeTab`** (Proton Security Model):
  - *Utility*: Allows the extension to interact with the page you are currently viewing.
  - *Privacy Standpoint*: High. The extension is "blind" to your browsing until you explicitly click the extension icon. It cannot "see" other tabs or your history.
- **`scripting`** (Local Processing):
  - *Utility*: Required to scroll the page for screenshots, extract article text, and capture your highlighted quotes.
  - *Privacy Standpoint*: All scripts run locally in your browser's memory. No extracted content is ever sent to an external server; it is strictly used to populate the share window on your device.
- **`menus`** (UI Only):
  - *Utility*: Adds the "Share with Another Share" option to your right-click context menu.
- **`storage`** (Private Local Vault):
  - *Utility*: Saves your settings (hidden platforms, custom templates).
  - *Privacy Standpoint*: Secure. We use `browser.storage.local`, which is a private vault on your physical device. Unlike `storage.sync`, your data is **never** uploaded to a browser profile or cloud account.
- **`tabs` [NEW]** (Window Management):
  - *Utility*: Required to correctly match the background script to the active window for scrolling screenshots.
  - *Privacy Standpoint*: Limited access. We only use this to retrieve the URL and Title of the current tab to prep your share post. It is never used to track your session.
- **`host_permissions` (<all_urls>) [NEW]** (Deep Page Access):
  - *Utility*: Grants the extension the authority to process full-page captures on any website.
  - *Privacy Standpoint*: While this is a broad technical permission, we mitigate any risk by ensuring **zero tracking** and **fully local processing**. It is the only way to allow "Full Shot" to function.

## Privacy Policy
This extension is built with a **Zero Data Collection** commitment:
- **No Tracking**: We do not collect, transmit, or store any personal data, browsing history, or sharing habits.
- **No External Servers**: All logic is executed locally on your device. No third-party APIs or analytics are used.
- **Privacy Scrubbing**: The extension automatically removes intrusive tracking parameters (like `utm_source`) from URLs before they are shared.
- **Ephemeral Metadata**: Metadata extracted from pages (titles, quotes) is stored in memory only while the popup is open and is purged immediately upon closing.

## How to Install (Development Mode)
1. Open Firefox and go to `about:debugging`.
2. Click on **"This Firefox"** in the sidebar.
3. Click **"Load Temporary Add-on..."**.
4. Select the `manifest.json` file in this directory.

## Development
This project uses `web-ext` for easy development.
```bash
npm install
npm start
```
