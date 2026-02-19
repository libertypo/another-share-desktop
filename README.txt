ANOTHER SHARE EXTENSION - DESKTOP VERSION
=======================================

A native-feeling, privacy-focused Firefox extension to share articles and selected text with a single click.

FEATURES & TOOLS BREAKDOWN
-------------------------
1. SHOT (Visible Area Capture)
   - Captures exactly what you see in the current browser window.
   - Ideal for quick snippets without needing to scroll.

2. FULL (Scrolling Capture)
   - Automatically scrolls the entire web page and stitches it into one long image.
   - Useful for archiving full articles or long threads.

3. THREAD FULL (Content Extraction)
   - Intelligently extracts the main text body of an article, stripping away ads and clutter.
   - Automatically splits long text into numbered parts for sequential sharing (Threads).

4. TEXT (Clean Export)
   - Extracts the core article content and saves it as a clean .txt file on your computer.

5. PRINT/PDF
   - Triggers the browser's native print interface for immediate hardcopy or saving as a high-quality PDF.

6. READER MODE TOGGLE
   - When enabled, shared links are automatically formatted as 'about:reader?url=...'.
   - This allows recipients (who also use Firefox) to open the link directly in a clutter-free view.

7. PRIVACY SCRUBBING
   - All shared URLs are automatically cleaned of tracking parameters (UTM, fbclid, etc.).

8. PREVIEW WORKFLOW
   - Screenshots open an internal preview before saving, allowing you to verify the capture.


EXTENSION SETTINGS (OPTIONS)
---------------------------
- Platform Order: Drag and drop to reorder which social platforms appear in your share grid.
- Hidden Platforms: Disable services you don't use to keep the interface clean.
- Custom Template: Add support for self-hosted instances (like Mastodon or private link shorteners) using a {url} and {title} template.
- Screenshot Format: Choose between high-fidelity PNG or space-efficient JPEG.
- Screenshot Quality: Adjust compression levels for JPEG captures.
- Debug Logging: Opt-in logging facility to help troubleshoot issues (disabled by default).

PRIVACY POLICY
--------------
- Zero Data Collection commitment.
- All processing happens locally on your device.
- No external APIs or tracking scripts.

HOW TO INSTALL (MANUAL)
-----------------------
1. Open Firefox and go to about:debugging.
2. Click on "This Firefox" in the sidebar.
3. Click "Load Temporary Add-on...".
4. Select the .xpi file or the manifest.json in the desktop_extension folder.

PERMISSIONS
-----------
- activeTab: To interact with the current page.
- scripting: For screenshots and text extraction.
- storage: To save your preferences locally.
- tabs: For window and tab management.

DEVELOPMENT
-----------
This version is optimized for Firefox Desktop.
Version: 0.1.7.7
