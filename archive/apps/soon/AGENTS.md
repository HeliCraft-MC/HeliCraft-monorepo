# Coming soon app guidance

- This is a standalone Node.js HTTP app. Keep it dependency-free unless a concrete need requires a package.
- Preserve the app's independent Docker build context. Copy approved brand assets into this app instead of reaching across app directories at build time.
- Keep the page responsive, accessible, and visually consistent with Vesper's dark palette and red accents.
- Use the Press Start 2P Google Font for the header and primary heading. Keep a pixel monospace fallback.
- Use the copied `public/screenshots` assets for the background slideshow. Keep this app self-contained and do not remove the originals from Vesper.
- Bind to `0.0.0.0` in containers and use the `PORT` environment variable.
- Run the app with Docker Compose from this directory. Remove the compose service and its local image after temporary verification when asked.
