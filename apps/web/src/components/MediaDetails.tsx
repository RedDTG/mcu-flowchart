"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppNavbar } from "./AppNavbar";
import { apiV1Path, resolvePosterUrl } from "../lib/api";

type ConnectionType = "required" | "optional" | "references";
type ConnectionLink = { media_id: string; saga_id?: never } | { saga_id: string; media_id?: never };

type RelatedItem =
  | {
      kind: "media";
      id: string;
      href: string;
      title: string;
      poster: string;
      release_date: string;
      saga?: string | null;
      universe: string;
      mediatype: string;
    }
  | {
      kind: "saga";
      id: string;
      href: string;
      title: string;
      poster: string;
      universe?: string | null;
      titleCount: number;
    };

interface Media {
  id: string;
  title: string;
  release_date: string;
  end_date?: string | null;
  saga?: string | null;
  universe: string;
  mediatype: string;
  poster: string;
  summary: string;
  connections: {
    required: ConnectionLink[];
    optional: ConnectionLink[];
    references: ConnectionLink[];
  };
}

interface RelatedSection {
  key: ConnectionType;
  title: string;
  subtitle: string;
  accentClass: string;
  items: RelatedItem[];
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
  poster: string;
}

function formatMediaTypeLabel(mediatype: string) {
  return mediatype.charAt(0).toUpperCase() + mediatype.slice(1);
}

function formatBadgeLabel(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDateLabel(dateValue: string) {
  return new Date(dateValue).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function hexToRgba(hex: string, alpha: number) {
  const normalizedHex = hex.replace("#", "");
  const value = parseInt(normalizedHex, 16);

  if (Number.isNaN(value) || normalizedHex.length !== 6) {
    return `rgba(39, 39, 42, ${alpha})`;
  }

  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function getMediaTypeStyles(mediatype: string) {
  if (mediatype === "show") {
    return {
      labelClass: "text-blue-400",
      badgeClass: "bg-blue-500/50 text-blue-100",
      hoverBorderClass: "group-hover:border-blue-500/60",
      hoverDividerClass: "group-hover:border-blue-400/90",
    };
  }

  if (mediatype === "special") {
    return {
      labelClass: "text-green-400",
      badgeClass: "bg-green-500/50 text-green-100",
      hoverBorderClass: "group-hover:border-green-500/60",
      hoverDividerClass: "group-hover:border-green-400/90",
    };
  }

  return {
    labelClass: "text-red-400",
    badgeClass: "bg-red-500/50 text-red-100",
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

function ConnectedStoriesIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-white" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 7h10v10H7z" />
      <path d="M5 12H3" />
      <path d="M21 12h-2" />
      <path d="M12 5V3" />
      <path d="M12 21v-2" />
    </svg>
  );
}

function RelatedCarousel({
  section,
  resolvePosterUrl,
  universeMetadata,
  sagaMetadata,
}: {
  section: RelatedSection;
  resolvePosterUrl: (poster: string) => string;
  universeMetadata: Record<string, UniverseMetadata>;
  sagaMetadata: Record<string, SagaMetadata>;
}) {
  const railRef = useRef<HTMLDivElement | null>(null);

  const scrollByAmount = (direction: "left" | "right") => {
    const rail = railRef.current;
    if (!rail) {
      return;
    }

    rail.scrollBy({ left: direction === "left" ? -360 : 360, behavior: "smooth" });
  };

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/40 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.22)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={`text-sm font-bold uppercase tracking-[0.2em] ${section.accentClass}`}>{section.title}</h3>
            <span className="rounded-full border border-zinc-700 bg-zinc-900/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-300">
              {section.items.length}
            </span>
          </div>
          <p className="text-xs text-zinc-400">{section.subtitle}</p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => scrollByAmount("left")}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700/80 bg-zinc-900/80 text-zinc-200 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-zinc-500 hover:bg-zinc-800 hover:brightness-110"
            aria-label={`Scroll ${section.title} left`}
          >
            <CarouselArrowIcon direction="left" />
          </button>
          <button
            type="button"
            onClick={() => scrollByAmount("right")}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700/80 bg-zinc-900/80 text-zinc-200 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-zinc-500 hover:bg-zinc-800 hover:brightness-110"
            aria-label={`Scroll ${section.title} right`}
          >
            <CarouselArrowIcon direction="right" />
          </button>
        </div>
      </div>

      <div
        ref={railRef}
        className="mt-4 flex gap-3 overflow-x-auto pb-2 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {section.items.map((item) => {
          if (item.kind === "saga") {
            return (
              <Link key={`saga-${item.id}`} href={item.href} className="group block w-28 shrink-0 sm:w-30">
                <article className="relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 transition hover:-translate-y-0.5 group-hover:border-violet-500/70">
                  <div className="relative aspect-2/3 bg-zinc-800">
                    <Image
                      src={resolvePosterUrl(item.poster)}
                      alt={item.title}
                      fill
                      className="object-cover"
                      sizes="120px"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/20 to-transparent" />
                    <span className="absolute left-1.5 top-1.5 rounded-full bg-violet-500/35 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-violet-100 transition-opacity duration-300 group-hover:opacity-0">
                      Saga
                    </span>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-2 pt-8">
                    <div className="border-b border-zinc-600/90 pb-1 transition-colors duration-300 group-hover:border-violet-500/70">
                      <p className="line-clamp-2 text-[11px] font-semibold leading-snug text-zinc-100">{item.title}</p>
                    </div>
                    <div className="mt-1 max-h-0 overflow-hidden opacity-0 transition-all duration-300 group-hover:max-h-16 group-hover:opacity-100">
                      <p className="text-[10px] tracking-wide text-zinc-300">
                        {item.universe
                          ? `${universeMetadata[item.universe]?.short_name ?? "Unknown"} • ${item.titleCount} titre${item.titleCount > 1 ? "s" : ""}`
                          : `${item.titleCount} titre${item.titleCount > 1 ? "s" : ""}`}
                      </p>
                    </div>
                  </div>
                </article>
              </Link>
            );
          }

          const mediaTypeStyles = getMediaTypeStyles(item.mediatype);

          return (
            <Link key={item.id} href={item.href} className="group block w-28 shrink-0 sm:w-30">
              <article className={`relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 transition hover:-translate-y-0.5 ${mediaTypeStyles.hoverBorderClass}`}>
                <div className="relative aspect-2/3 bg-zinc-800">
                  <Image
                    src={resolvePosterUrl(item.poster)}
                    alt={item.title}
                    fill
                    className="object-cover"
                    sizes="120px"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/20 to-transparent" />
                  <span className={`absolute left-1.5 top-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide transition-opacity duration-300 group-hover:opacity-0 ${mediaTypeStyles.badgeClass}`}>
                    {formatMediaTypeLabel(item.mediatype)}
                  </span>
                </div>
                <div className="absolute inset-x-0 bottom-0 p-2 pt-8">
                  <div className={`border-b border-zinc-600/90 pb-1 transition-colors duration-300 ${mediaTypeStyles.hoverDividerClass}`}>
                    <p className="line-clamp-2 text-[11px] font-semibold leading-snug text-zinc-100">{item.title}</p>
                  </div>
                  <div className="mt-1 max-h-0 overflow-hidden opacity-0 transition-all duration-300 group-hover:max-h-16 group-hover:opacity-100">
                    <p className="text-[10px] tracking-wide text-zinc-300">
                      {universeMetadata[item.universe]?.name ?? "Unknown universe"}
                    </p>
                    <p className="text-[10px] text-zinc-300">
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
    </div>
  );
}

export function MediaDetails({ mediaId }: { mediaId: string }) {
  const [media, setMedia] = useState<Media | null>(null);
  const [allMedia, setAllMedia] = useState<Media[]>([]);
  const [universeMetadata, setUniverseMetadata] = useState<Record<string, UniverseMetadata>>({});
  const [sagaMetadata, setSagaMetadata] = useState<Record<string, SagaMetadata>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [mediaResponse, allMediaResponse, universesResponse, sagasResponse] = await Promise.all([
          fetch(apiV1Path(`/media/${mediaId}`)),
          fetch(apiV1Path("/media")),
          fetch(apiV1Path("/universes")),
          fetch(apiV1Path("/sagas")),
        ]);

        if (!mediaResponse.ok) {
          throw new Error("Media not found");
        }

        if (!allMediaResponse.ok) {
          throw new Error(`API error: ${allMediaResponse.status}`);
        }

        if (!universesResponse.ok) {
          throw new Error(`API error: ${universesResponse.status}`);
        }

        if (!sagasResponse.ok) {
          throw new Error(`API error: ${sagasResponse.status}`);
        }

        const [mediaData, allMediaData, universesData, sagasData] = (await Promise.all([
          mediaResponse.json(),
          allMediaResponse.json(),
          universesResponse.json(),
          sagasResponse.json(),
        ])) as [Media, Media[], UniverseMetadata[], SagaMetadata[]];

        setMedia(mediaData);
        setAllMedia(allMediaData);
        setUniverseMetadata(
          Object.fromEntries(universesData.map((universe) => [universe.id, universe])) as Record<string, UniverseMetadata>,
        );
        setSagaMetadata(
          Object.fromEntries(sagasData.map((saga) => [saga.id, saga])) as Record<string, SagaMetadata>,
        );
      } catch (err) {
        const message =
          err instanceof TypeError
            ? "Unable to reach the API proxy. Start the backend and check the Docker/rewrites setup."
            : err instanceof Error
              ? err.message
              : "Unexpected error while loading media.";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [mediaId]);

  const mediaIndex = useMemo(() => {
    return new Map(allMedia.map((item) => [item.id, item]));
  }, [allMedia]);

  const relatedSections = useMemo<RelatedSection[]>(() => {
    if (!media) {
      return [];
    }

    const resolveRelated = (links: ConnectionLink[]) => {
      const relatedItems: RelatedItem[] = [];
      const seen = new Set<string>();

      const pushMediaIfValid = (item: Media | undefined) => {
        if (!item || item.id === media.id || seen.has(item.id)) {
          return;
        }
        seen.add(item.id);
        relatedItems.push({
          kind: "media",
          id: item.id,
          href: `/media/${item.id}`,
          title: item.title,
          poster: item.poster,
          release_date: item.release_date,
          saga: item.saga,
          universe: item.universe,
          mediatype: item.mediatype,
        });
      };

      for (const link of links) {
        if ("media_id" in link && link.media_id) {
          pushMediaIfValid(mediaIndex.get(link.media_id));
          continue;
        }

        if (!("saga_id" in link) || !link.saga_id || seen.has(`saga:${link.saga_id}`)) {
          continue;
        }

        const saga = sagaMetadata[link.saga_id];
        if (!saga) {
          continue;
        }

        const sagaMediaEntries = allMedia
          .filter((candidate) => candidate.saga === link.saga_id)
          .sort((first, second) => first.release_date.localeCompare(second.release_date));

        const firstSagaMedia = sagaMediaEntries[0];

        const sagaAnchor = firstSagaMedia?.universe
          ? `/all-media#${firstSagaMedia.universe}__${link.saga_id}`
          : "/all-media";

        seen.add(`saga:${link.saga_id}`);
        relatedItems.push({
          kind: "saga",
          id: link.saga_id,
          href: sagaAnchor,
          title: saga.name,
          poster: saga.poster,
          universe: firstSagaMedia?.universe,
          titleCount: sagaMediaEntries.length,
        });
      }

      return relatedItems;
    };

    const sections: RelatedSection[] = [
      {
        key: "required",
        title: "Must Watch",
        subtitle: "Watch these before the current title.",
        accentClass: "text-red-400",
        items: resolveRelated(media.connections.required),
      },
      {
        key: "optional",
        title: "Optional",
        subtitle: "Helpful context, but not required.",
        accentClass: "text-yellow-300",
        items: resolveRelated(media.connections.optional),
      },
      {
        key: "references",
        title: "References",
        subtitle: "Easter eggs, callbacks, and hidden connections.",
        accentClass: "text-blue-300",
        items: resolveRelated(media.connections.references),
      },
    ];

    return sections.filter((section) => section.items.length > 0);
  }, [allMedia, media, mediaIndex]);

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-b from-zinc-900 to-black flex items-center justify-center">
        <p className="text-zinc-300">Loading media details...</p>
      </div>
    );
  }

  if (error || !media) {
    return (
      <div className="min-h-screen bg-linear-to-b from-zinc-900 to-black flex items-center justify-center px-4">
        <div className="text-center">
          <p className="mb-4 text-red-300">Error: {error || "Media not found"}</p>
          <Link href="/" className="text-blue-300 hover:text-blue-200 underline">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-zinc-900 to-black text-zinc-100">
      <AppNavbar />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:py-10">
        <div className="space-y-8">
          <section className="min-w-0 flex-1 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4 sm:p-6">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
              <div className="shrink-0 lg:w-50">
                <div className="relative mx-auto aspect-2/3 w-full max-w-50 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 lg:mx-0">
                  <Image
                    src={resolvePosterUrl(media.poster)}
                    alt={media.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 180px, 200px"
                    unoptimized
                    priority
                  />
                </div>
              </div>

              <div className="min-w-0 flex-1 space-y-3 text-center sm:text-left">
                <p className={`text-md font-semibold uppercase tracking-[0.2em] ${getMediaTypeStyles(media.mediatype).labelClass}`}>
                  {formatMediaTypeLabel(media.mediatype)}
                </p>
                <h1 className="text-3xl font-black leading-tight text-white sm:text-4xl">{media.title}</h1>

                <div className="flex flex-wrap justify-center gap-3 text-sm sm:justify-start">
                  <span className="rounded-full border border-zinc-700 bg-zinc-900/80 px-4 py-2 text-zinc-200">
                    {media.end_date && media.end_date !== media.release_date
                      ? `${formatDateLabel(media.release_date)} - ${formatDateLabel(media.end_date)}`
                      : formatDateLabel(media.release_date)}
                  </span>
                  <Link
                    href={media.saga ? `/all-media#${media.universe}__${media.saga}` : `/all-media#${media.universe}`}
                    className="rounded-full border px-4 py-2 text-sm font-semibold transition hover:-translate-y-0.5 hover:brightness-110"
                    style={{
                      borderColor: universeMetadata[media.universe]?.color ?? "#52525b",
                      backgroundColor: hexToRgba(universeMetadata[media.universe]?.color ?? "#27272a", 0.2),
                      color: "#ffffff",
                    }}
                  >
                    {media.saga
                      ? sagaMetadata[media.saga]?.name ?? formatBadgeLabel(media.saga)
                      : universeMetadata[media.universe]?.name ?? formatBadgeLabel(media.universe)}
                  </Link>
                </div>

                <p className="mx-auto max-w-3xl leading-relaxed whitespace-pre-line text-zinc-300 sm:mx-0">{media.summary}</p>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-3xl border-zinc-800/80 from-zinc-950 via-zinc-900/70 to-black p-4 sm:p-6 shadow-2xl shadow-black/30">
            <div className="mb-5 flex flex-col items-start justify-between gap-4 pb-2 sm:flex-row">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-300">
                  <span className="h-2 w-2 rounded-full bg-red-400" />
                  Connected Stories
                </div>
                <div>
                  <h2 className="text-xl font-black text-white sm:text-3xl">Everything linked to this {formatMediaTypeLabel(media.mediatype).toLowerCase()}</h2>
                </div>
              </div>
            </div>

            {relatedSections.length === 0 && (
              <div className="flex items-center gap-3 rounded-2xl border border-dashed border-zinc-700 bg-zinc-950/60 p-5 text-sm text-zinc-400">
                <div>
                  <p className="font-semibold text-zinc-200">No connected stories yet</p>
                  <p className="mt-0.5">This title doesn&apos;t have related entries in the dataset right now.</p>
                </div>
              </div>
            )}

            {relatedSections.length > 0 && (
              <div className="space-y-6">
                {relatedSections.map((section) => (
                  <RelatedCarousel
                    key={section.key}
                    section={section}
                    resolvePosterUrl={resolvePosterUrl}
                    universeMetadata={universeMetadata}
                    sagaMetadata={sagaMetadata}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

