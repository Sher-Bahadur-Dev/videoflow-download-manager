<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/aa11519f-ea3c-4dd8-b5b3-4ca1a914f740

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`


## Windows download engine requirements

VideoFlow bundles `bin/yt-dlp` as a Python script. On Windows the app now invokes that script through Python instead of trying to execute the Unix shebang directly. This fixes the `spawn ...\bin\yt-dlp ENOENT` failure seen in the server log.

Make sure Python is installed and available from Command Prompt:

```bat
python --version
```

If `python` is not recognized, install Python and enable **Add Python to PATH**. You can also set `PYTHON_COMMAND` to a custom Python executable/launcher before starting the server.

For YouTube video/audio formats that require merging or transcoding, install FFmpeg and make sure `ffmpeg` is available in PATH.

The interface is intentionally a conventional desktop download manager: menu bar, toolbar, download table, category tree, queue/history, status bar and a standard "Add New Download" dialog. It does not present download inspection as an AI-generation feature.
