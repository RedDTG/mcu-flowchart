const API_PREFIX = "/api/v1";

export function apiV1Path(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  if (path.startsWith("/")) {
    return `${API_PREFIX}${path}`;
  }

  return `${API_PREFIX}/${path}`;
}

export function resolvePosterUrl(poster: string): string {
  if (poster.startsWith("http://") || poster.startsWith("https://")) {
    return poster;
  }

  if (poster.startsWith("/api/v1/posters/")) {
    return poster;
  }

  if (poster.startsWith("/posters/")) {
    return `${API_PREFIX}${poster}`;
  }

  const normalizedPoster = poster.startsWith("/") ? poster : `/${poster}`;
  if (normalizedPoster.startsWith("/api/v1/")) {
    return normalizedPoster;
  }

  return `${API_PREFIX}${normalizedPoster}`;
}