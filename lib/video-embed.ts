export type VideoEmbedProvider = "youtube" | "drive";

export function getVideoEmbedUrl(
  videoUrl: string | null | undefined,
  videoProvider?: string | null,
): { provider: VideoEmbedProvider; url: string } | null {
  if (!videoUrl) return null;

  let parsed: URL;
  try {
    parsed = new URL(videoUrl);
  } catch {
    return null;
  }

  const provider = videoProvider?.toLowerCase();
  const youtubeId =
    provider?.includes("youtube")
      ? getYouTubeId(parsed)
      : provider?.includes("drive")
        ? null
        : getYouTubeId(parsed);

  if (youtubeId) {
    return {
      provider: "youtube",
      url: `https://www.youtube-nocookie.com/embed/${youtubeId}`,
    };
  }

  const driveId =
    provider?.includes("drive") ? getDriveId(parsed) : getDriveId(parsed);
  if (driveId) {
    return {
      provider: "drive",
      url: `https://drive.google.com/file/d/${driveId}/preview`,
    };
  }

  return null;
}

function getYouTubeId(url: URL) {
  if (url.hostname === "youtu.be") {
    return cleanId(url.pathname.slice(1));
  }

  if (url.hostname.endsWith("youtube.com")) {
    if (url.pathname === "/watch") return cleanId(url.searchParams.get("v"));
    if (url.pathname.startsWith("/shorts/")) return cleanId(url.pathname.split("/")[2]);
    if (url.pathname.startsWith("/embed/")) return cleanId(url.pathname.split("/")[2]);
  }

  return null;
}

function getDriveId(url: URL) {
  if (url.hostname !== "drive.google.com") return null;
  const fileMatch = url.pathname.match(/^\/file\/d\/([^/]+)/);
  if (fileMatch) return cleanId(fileMatch[1]);
  return cleanId(url.searchParams.get("id"));
}

function cleanId(value: string | null | undefined) {
  return value && /^[\w-]+$/.test(value) ? value : null;
}
