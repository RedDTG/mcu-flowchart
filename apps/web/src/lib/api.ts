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

  const normalizedPoster = poster.startsWith("/") ? poster : `/${poster}`;
  return `${API_PREFIX}${normalizedPoster}`;
}