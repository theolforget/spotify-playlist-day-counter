const {
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  SPOTIFY_REFRESH_TOKEN,
  SPOTIFY_PLAYLIST_ID,
  TIMEZONE = "America/Los_Angeles"
} = process.env;

function requireEnv(name, value) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}

requireEnv("SPOTIFY_CLIENT_ID", SPOTIFY_CLIENT_ID);
requireEnv("SPOTIFY_CLIENT_SECRET", SPOTIFY_CLIENT_SECRET);
requireEnv("SPOTIFY_REFRESH_TOKEN", SPOTIFY_REFRESH_TOKEN);
requireEnv("SPOTIFY_PLAYLIST_ID", SPOTIFY_PLAYLIST_ID);

function getPacificDateParts(timeZone) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric"
  });

  const parts = formatter.formatToParts(new Date());
  const get = (type) => Number(parts.find((p) => p.type === type)?.value);

  return {
    year: get("year"),
    month: get("month"),
    day: get("day")
  };
}

function getDayOfYearInTimeZone(timeZone) {
  const { year, month, day } = getPacificDateParts(timeZone);
  const utcMidnight = Date.UTC(year, month - 1, day);
  const utcYearStart = Date.UTC(year, 0, 1);
  return Math.floor((utcMidnight - utcYearStart) / 86400000) + 1;
}

async function refreshAccessToken() {
  const credentials = Buffer.from(
    `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
  ).toString("base64");

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: SPOTIFY_REFRESH_TOKEN
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to refresh access token: ${response.status} ${text}`);
  }

  const data = await response.json();

  if (!data.access_token) {
    throw new Error("Spotify token response did not include access_token");
  }

  return data.access_token;
}

async function getPlaylist(accessToken, playlistId) {
  const response = await fetch(
    `https://api.spotify.com/v1/playlists/${playlistId}?fields=id,name,description,items(total),owner(id),public`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch playlist: ${response.status} ${text}`);
  }

  return response.json();
}

async function updatePlaylistDescription(accessToken, playlistId, description) {
  const response = await fetch(
    `https://api.spotify.com/v1/playlists/${playlistId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ description })
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to update playlist description: ${response.status} ${text}`);
  }
}

async function main() {
  const accessToken = await refreshAccessToken();
  const playlist = await getPlaylist(accessToken, SPOTIFY_PLAYLIST_ID);

  const rawDay = getDayOfYearInTimeZone(TIMEZONE);
  const year = new Date().toLocaleString("en-US", {
    timeZone: TIMEZONE,
    year: "numeric"
  });

  const day = Number(year) > 2026 ? 365 : rawDay;
  const songs = playlist?.items?.total ?? 0;
  const newDescription = `${day} days | ${songs} songs`;
  const currentDescription = playlist?.description ?? "";

  console.log(`Playlist: ${playlist.name}`);
  console.log("Raw playlist response:", JSON.stringify(playlist, null, 2));
  console.log(`Current description: ${currentDescription}`);
  console.log(`New description: ${newDescription}`);

  if (currentDescription === newDescription) {
    console.log("No update needed.");
    return;
  }

  await updatePlaylistDescription(accessToken, SPOTIFY_PLAYLIST_ID, newDescription);
  console.log("Playlist description updated successfully.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
