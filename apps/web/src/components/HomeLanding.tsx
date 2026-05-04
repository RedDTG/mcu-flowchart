"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppNavbar } from "./AppNavbar";
import { apiV1Path, resolvePosterUrl } from "../lib/api";

interface Media {
  id: string;
  title: string;
  release_date: string;
  end_date?: string | null;
  saga?: string | null;
  universe: string;
  mediatype: "movie" | "show" | "special";
  poster: string;
  summary: string;
}

interface UniverseMetadata {
  id: string;
  name: string;
  short_name: string;
  color: string;
}

interface SagaMetadata {
  id: string;
  name: string;
  short_name: string;
}

interface FeaturedMedia extends Media {
  badge: "released" | "airing" | "upcoming";
  relativeLabel: string;
}

function getReleaseDate(media: Media) {
  return new Date(media.release_date);
}

function getEndDate(media: Media) {
  if (!media.end_date) {
    return null;
  }

  return new Date(media.end_date);
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatRelativeDays(dayDifference: number, isUpcoming: boolean) {
  if (dayDifference === 0) {
    return isUpcoming ? "Releases today" : "Released today";
  }

  const suffix = dayDifference === 1 ? "day" : "days";
  return isUpcoming ? `In ${dayDifference} ${suffix}` : `Released ${dayDifference} ${suffix} ago`;
}

function formatMediaTypeLabel(mediatype: Media["mediatype"]) {
  return mediatype.charAt(0).toUpperCase() + mediatype.slice(1);
}

function getMediaTypeStyles(mediatype: Media["mediatype"]) {
  if (mediatype === "show") {
    return {
      badgeClass: "media-type-badge bg-blue-500/50 text-blue-100",
      hoverBorderClass: "group-hover:border-blue-500/60",
      hoverDividerClass: "group-hover:border-blue-400/90",
    };
  }

  if (mediatype === "special") {
    return {
      badgeClass: "media-type-badge bg-green-500/50 text-green-100",
      hoverBorderClass: "group-hover:border-green-500/60",
      hoverDividerClass: "group-hover:border-green-400/90",
    };
  }

  return {
    badgeClass: "media-type-badge bg-red-500/50 text-red-100",
    hoverBorderClass: "group-hover:border-red-500/60",
    hoverDividerClass: "group-hover:border-red-400/90",
  };
}

function CarouselArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-4 w-4"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {direction === "left" ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 6l6 6-6 6" />}
    </svg>
  );
}

function getFeaturedBadgeClass(badge: FeaturedMedia["badge"]) {
  if (badge === "released") {
    return "bg-green-500/30 text-green-100";
  }

  if (badge === "airing") {
    return "bg-blue-500/35 text-blue-100";
  }

  return "bg-red-500/30 text-red-100";
}

function MediaCarousel({
  id,
  title,
  items,
  universeMetadata,
  sagaMetadata,
}: {
  id: string;
  title: string;
  items: Media[];
  universeMetadata: Record<string, UniverseMetadata>;
  sagaMetadata: Record<string, SagaMetadata>;
}) {
  const carouselRef = useRef<HTMLDivElement | null>(null);

  const scrollByCards = (direction: "left" | "right") => {
    const container = carouselRef.current;
    if (!container) {
      return;
    }

    const distance = direction === "left" ? -420 : 420;
    container.scrollBy({ left: distance, behavior: "smooth" });
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <section id={id} className="space-y-4 scroll-mt-24 md:scroll-mt-28">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white sm:text-2xl">{title}</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => scrollByCards("left")}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-600 bg-zinc-900/90 text-zinc-200 transition duration-200 hover:-translate-y-0.5 hover:border-zinc-400 hover:bg-zinc-800 hover:brightness-110 hover:text-white"
            aria-label={`Scroll ${title} left`}
          >
            <CarouselArrowIcon direction="left" />
          </button>
          <button
            type="button"
            onClick={() => scrollByCards("right")}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-600 bg-zinc-900/90 text-zinc-200 transition duration-200 hover:-translate-y-0.5 hover:border-zinc-400 hover:bg-zinc-800 hover:brightness-110 hover:text-white"
            aria-label={`Scroll ${title} right`}
          >
            <CarouselArrowIcon direction="right" />
          </button>
        </div>
      </div>

      <div
        ref={carouselRef}
        className="flex gap-4 overflow-x-auto pb-2 pt-2 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item) => {
          const mediaTypeStyles = getMediaTypeStyles(item.mediatype);

          return (
            <Link
              key={item.id}
              href={`/media/${item.id}`}
              className="group min-w-36 max-w-36 snap-start sm:min-w-45 sm:max-w-45"
            >
              <article className={`relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70 transition-transform duration-300 group-hover:-translate-y-1 ${mediaTypeStyles.hoverBorderClass}`}>
                <div className="relative aspect-2/3 bg-zinc-800">
                  <Image
                    src={resolvePosterUrl(item.poster)}
                    alt={item.title}
                    fill
                    className="object-cover"
                    sizes="180px"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/20 to-transparent" />
                  <span className={`absolute left-2 top-2 rounded-full px-1.5 py-0.5 text-[11px] font-semibold tracking-wide transition-opacity duration-300 group-hover:opacity-0 ${mediaTypeStyles.badgeClass}`}>
                    {formatMediaTypeLabel(item.mediatype)}
                  </span>
                </div>

                <div className="absolute inset-x-0 bottom-0 p-3 pt-10">
                  <div className={`border-b border-zinc-600/90 pb-2 transition-colors duration-300 ${mediaTypeStyles.hoverDividerClass}`}>
                    <h3 className="line-clamp-2 text-sm font-semibold text-white">{item.title}</h3>
                  </div>
                  <div className="mt-2 max-h-0 overflow-hidden opacity-0 transition-all duration-300 group-hover:max-h-20 group-hover:opacity-100">
                    <p className="text-[11px] tracking-wide text-zinc-300">
                      {universeMetadata[item.universe]?.name ?? "Unknown universe"}
                    </p>
                    <p className="text-xs text-zinc-300">
                      {new Date(item.release_date).getFullYear()}
                      {item.saga && sagaMetadata[item.saga]?.short_name ? ` • ${sagaMetadata[item.saga].short_name}` : ""}
                    </p>
                  </div>
                </div>
              </article>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function FeaturedMediaSection({ items }: { items: FeaturedMedia[] }) {
  return (
    <section className="space-y-5 scroll-mt-24 md:scroll-mt-28">
      <div>
        <h2 className="text-xl font-bold text-white sm:text-2xl">Upcoming and airing</h2>
      </div>
      <div className="flex flex-wrap justify-center gap-4 pb-2 pt-2 sm:gap-5">
        {items.map((item) => {
          const mediaTypeStyles = getMediaTypeStyles(item.mediatype);
          const featuredBadgeClass = getFeaturedBadgeClass(item.badge);

          return (
            <Link key={item.id} href={`/media/${item.id}`} className="group block h-136 min-w-0 w-full sm:h-65 lg:w-[calc(50%-0.625rem)]">
              <article className={`h-full w-full overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/80 transition duration-300 group-hover:-translate-y-1 ${mediaTypeStyles.hoverBorderClass}`}>
                <div className="flex h-full flex-col sm:flex-row">
                  <div className="relative h-52 w-full shrink-0 bg-zinc-800 sm:h-auto sm:w-45 xl:w-50">
                    <Image
                      src={resolvePosterUrl(item.poster)}
                      alt={item.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1280px) 180px, 200px"
                      unoptimized
                    />
                    <div className="featured-card-overlay absolute inset-0 bg-linear-to-t from-black/30 via-black/5 to-transparent sm:bg-linear-to-r" />
                  </div>

                  <div className="min-w-0 flex-1 flex flex-col justify-between gap-4 p-4 sm:p-6 xl:p-8">
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-wide">
                        <span className={`rounded-full px-2 py-1 ${featuredBadgeClass}`}>
                          {item.badge === "released" ? "Released" : item.badge === "airing" ? "Airing" : "Upcoming"}
                        </span>
                      </div>

                      <div className={`border-b border-zinc-600/90 pb-3 transition-colors duration-300 ${mediaTypeStyles.hoverDividerClass}`}>
                        <h3 className="wrap-break-word text-lg font-black leading-tight text-white md:text-xl xl:text-xl">{item.title}</h3>
                      </div>

                      <p className="line-clamp-2 text-sm leading-relaxed text-zinc-300">
                        {item.summary}
                      </p>
                    </div>

                    {item.badge === "upcoming" && (
                      <div className="flex flex-wrap gap-2 text-sm text-zinc-300">
                        <span className="rounded-full border border-zinc-700 bg-zinc-950/60 px-4 py-2">
                          {item.relativeLabel}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function HomeLanding() {
  const [media, setMedia] = useState<Media[]>([]);
  const [universeMetadata, setUniverseMetadata] = useState<Record<string, UniverseMetadata>>({});
  const [sagaMetadata, setSagaMetadata] = useState<Record<string, SagaMetadata>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMedia = async () => {
      try {
        const [mediaResponse, universesResponse, sagasResponse] = await Promise.all([
          fetch(apiV1Path("/media")),
          fetch(apiV1Path("/universes")),
          fetch(apiV1Path("/sagas")),
        ]);

        if (!mediaResponse.ok) {
          throw new Error(`Media API error: ${mediaResponse.status}`);
        }

        if (!universesResponse.ok) {
          throw new Error(`Universes API error: ${universesResponse.status}`);
        }

        if (!sagasResponse.ok) {
          throw new Error(`Sagas API error: ${sagasResponse.status}`);
        }

        const mediaData = (await mediaResponse.json()) as Media[];
        const universesData = (await universesResponse.json()) as UniverseMetadata[];
        const sagasData = (await sagasResponse.json()) as SagaMetadata[];

        const sorted = [...mediaData].sort(
          (left, right) =>
            new Date(left.release_date).getTime() - new Date(right.release_date).getTime(),
        );

        setUniverseMetadata(
          Object.fromEntries(universesData.map((universe) => [universe.id, universe])) as Record<string, UniverseMetadata>,
        );
        setSagaMetadata(
          Object.fromEntries(sagasData.map((saga) => [saga.id, saga])) as Record<string, SagaMetadata>,
        );
        setMedia(sorted);
      } catch (err) {
        const message =
          err instanceof TypeError
            ? "Unable to reach the API proxy. Start the backend and check the Docker/rewrites setup."
            : err instanceof Error
              ? err.message
              : "Unexpected error";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchMedia();
  }, []);

  const latestMovies = useMemo(() => {
    return media
      .filter((item) => item.mediatype === "movie" && new Date(item.release_date) <= new Date())
      .sort((left, right) => new Date(right.release_date).getTime() - new Date(left.release_date).getTime())
      .slice(0, 12);
  }, [media]);

  const latestSeries = useMemo(() => {
    return media
      .filter((item) => item.mediatype === "show" && new Date(item.release_date) <= new Date())
      .sort((left, right) => new Date(right.release_date).getTime() - new Date(left.release_date).getTime())
      .slice(0, 12);
  }, [media]);

  const featuredReleases = useMemo<FeaturedMedia[]>(() => {
    const now = startOfDay(new Date());
    const dayMs = 1000 * 60 * 60 * 24;
    const monthDays = 30;
    const maxUpcomingDate = new Date(now.getTime() + 300 * dayMs);
    const oneMonthAgo = new Date(now.getTime() - monthDays * dayMs);
    const oneMonthAhead = new Date(now.getTime() + monthDays * dayMs);

    const today = new Date(now);

    return media
      .map((item) => {
        const releaseDate = getReleaseDate(item);
        const endDate = getEndDate(item);

        const isReleasedMedia =
          releaseDate <= today && releaseDate >= oneMonthAgo

        const isAiringShow =
          item.mediatype === "show" && releaseDate <= today && Boolean(endDate && endDate >= today);

        const isUpcomingMovie =
          item.mediatype === "movie" && releaseDate > today && releaseDate <= maxUpcomingDate;

        const isUpcomingShow =
          item.mediatype === "show" && releaseDate > today && releaseDate <= oneMonthAhead;

        let badge: FeaturedMedia["badge"] | null = null;
        if (isAiringShow) {
          badge = "airing";
        } else if (isUpcomingMovie || isUpcomingShow) {
          badge = "upcoming";
        } else if (isReleasedMedia) {
          badge = "released";
        }

        if (!badge) {
          return null;
        }

        const dayDifference = Math.max(0, Math.round(Math.abs(releaseDate.getTime() - now.getTime()) / dayMs));

        return {
          ...item,
          badge,
          relativeLabel:
            badge === "upcoming"
              ? formatRelativeDays(dayDifference, true)
              : badge === "airing"
                ? "Airing now"
                : "Released",
        };
      })
      .filter((item): item is FeaturedMedia => Boolean(item))
      .sort((left, right) => {
        const badgeOrder: Record<FeaturedMedia["badge"], number> = {
          released: 0,
          airing: 1,
          upcoming: 2,
        };

        const badgeDifference = badgeOrder[left.badge] - badgeOrder[right.badge];
        if (badgeDifference !== 0) {
          return badgeDifference;
        }

        if (left.badge === "released") {
          return getReleaseDate(right).getTime() - getReleaseDate(left).getTime();
        }

        return getReleaseDate(left).getTime() - getReleaseDate(right).getTime();
      })
      .slice(0, 6)
      ;
  }, [media]);

  return (
    <div className="min-h-screen bg-linear-to-b from-black via-zinc-950 to-black text-zinc-100">
      <AppNavbar />

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:gap-10 sm:py-10">
        <section className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-8 md:p-12">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-red-600/20 blur-3xl" />
          <div className="pointer-events-none absolute -left-24 -bottom-24 h-64 w-64 rounded-full bg-blue-600/20 blur-3xl" />

          <div className="relative z-10 mx-auto max-w-3xl space-y-4 text-center sm:mx-0 sm:text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-400">
              MCU Flowchart
            </p>
            <h1 className="text-3xl font-black leading-tight text-white sm:text-4xl md:text-5xl">
              The easiest way to navigate the Marvel multiverse.
            </h1>
            <p className="text-zinc-300">
              Catch up on any Marvel movie or series without the overwhelm.
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-2 sm:justify-start">
              {/* <Link
                href=""
                className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500"
              >
                See the Watching Map
              </Link> */}
              <Link
                href="/flowchart"
                className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500"
              >
                Use the Flowchart
              </Link>
              <Link
                href="/all-media"
                className="rounded-full border border-red-500/60 px-5 py-2 text-sm font-semibold text-red-200 transition hover:border-red-400 hover:text-white"
              >
                Explore every saga
              </Link>
            </div>
          </div>
        </section>

        {loading && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 text-zinc-300">
            Loading media...
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-900/60 bg-red-950/40 p-6 text-red-200">
            API error: {error}
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-10">
            {featuredReleases.length > 0 && <FeaturedMediaSection items={featuredReleases} />}

            <MediaCarousel
              id="latest-movies"
              title="Latest movies"
              items={latestMovies}
              universeMetadata={universeMetadata}
              sagaMetadata={sagaMetadata}
            />

            <MediaCarousel
              id="latest-series"
              title="Latest shows"
              items={latestSeries}
              universeMetadata={universeMetadata}
              sagaMetadata={sagaMetadata}
            />
          </div>
        )}
      </main>
    </div>
  );
}
