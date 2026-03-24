# spotify-playlist-day-counter

Updates a Spotify playlist description every 5 minutes using GitHub Actions.

Format:

Day {day} • {songs} songs

Example:

Day 84 • 127 songs

## Required GitHub Secrets

- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
- `SPOTIFY_REFRESH_TOKEN`
- `SPOTIFY_PLAYLIST_ID`
- `TIMEZONE`

Recommended timezone:

- `America/Los_Angeles`

## Run locally

```bash
node src/update-playlist.js
