---
name: Gemini scan timeout boundary
description: Reliability constraint for long-running Gemini image scans through the Replit preview proxy.
---

Keep the server-side Gemini timeout safely shorter than the client and Replit proxy timeout, and keep normal phone-photo request bodies compact.

**Why:** The required Gemini model can intermittently take longer than 45 seconds or return a high-demand 503. Waiting that long caused phones to report a browser-level fetch failure even though the route eventually logged a JSON timeout.

**How to apply:** Preserve one Gemini request per explicit scan. Return structured JSON for timeout and provider-capacity errors before the client aborts, and map transport failures to friendly client messages without fabricating results or automatically retrying.