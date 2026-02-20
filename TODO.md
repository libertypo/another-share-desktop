# Another Share - Roadmap & TODO

This list contains potential features and enhancements for future releases. Items are categorized by their primary impact.

##  Power User Features
- [ ] **Global Keyboard Shortcuts**: Define shortcuts in `manifest.json` for "Quick Share", "Markdown Copy", and "Save to Read Later".
- [ ] **Multi-Template Support**: Allow users to save and switch between different custom share templates (e.g., Work vs. Personal).
- [ ] **Platform-Specific Threading**: Extend the X/Twitter "chunking" logic to Bluesky and Mastodon.
- [ ] **Read Later Tagging**: Allow adding simple tags (e.g., #research, #to-read) when saving an article.

##  Interaction & Aesthetics
- [ ] **Popup Reordering**: Implement a "drag-and-drop" mode directly in the popup UI to reorder platforms on the fly.
- [ ] **Adaptive Theming**: Dynamically update popup accent colors to match the brand of the current website.
- [ ] **Micro-Animations**: Add subtle CSS animations for "Success" states (e.g., when copying or saving).
- [ ] **Glassmorphism Overhaul**: Refine the popup and options UI with more modern, premium CSS effects.

##  Advanced Privacy & Security
- [ ] **Deep Link De-cloaking**: Automatically resolve shortened redirect URLs (t.co, bit.ly) to strip nested tracking parameters.
- [ ] **Domain Blacklist UI**: Add a setting to permanently hide the "Another Share" sheet on specific user-defined domains.
- [ ] **Local Encryption**: Optional password protection for the "Read Later" storage in `browser.storage.local`.

##  Integration & Export
- [ ] **Bulk Export**: Export the "Read Later" list as a formatted Markdown file, CSV, or JSON.
- [ ] **Knowledge Base Sync**: Direct "Send to Obsidian" or "Send to Notion" integrations using local URI schemes.
- [ ] **Local RSS Feed**: Generate a local-only RSS endpoint for the "Read Later" list.

## Platform Expansion
- [ ] **Chromium Port**: Implement the Service Worker wrapper and API shim for Chrome, Edge, Brave, and Arc.
- [ ] **Safari / iOS Port**: Investigate requirements for porting to the Apple Ecosystem.
- [ ] **Self-Hosted Sync**: Enable syncing via WebDAV or Nextcloud to keep data private while sharing across devices.



