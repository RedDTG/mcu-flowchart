"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppNavbar } from "./AppNavbar";

interface Media {
  id: string;
  title: string;
  release_date: string;
  saga?: string | null;
  universe: string;
  mediatype: "movie" | "show" | "special";
  poster: string;
  summary: string;
}

interface UniverseOption {
  key: string;
  title: string;
  count: number;
  order: number;
  color: string;
}

interface SagaGroup {
  key: string;
  title: string;
  items: Media[];
  order: number;
  description?: string;
}

interface UniverseMetadata {
  id: string;
  name: string;
  short_name: string;
  order: number;
  color: string;
}

interface SagaMetadata {
  id: string;
  name: string;
  short_name: string;
  order: number;
  description?: string;
}

function hexToRgba(hexColor: string, alpha: number) {
  const sanitizedHex = hexColor.replace("#", "");
  const red = Number.parseInt(sanitizedHex.slice(0, 2), 16);
  const green = Number.parseInt(sanitizedHex.slice(2, 4), 16);
  const blue = Number.parseInt(sanitizedHex.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function formatMediaTypeLabel(mediatype: Media["mediatype"]) {
  return mediatype.charAt(0).toUpperCase() + mediatype.slice(1);
}

function getMediaTypeStyles(mediatype: Media["mediatype"]) {
  if (mediatype === "show") {
    return {
      badgeClass: "bg-blue-500/50 text-blue-100",
      hoverBorderClass: "group-hover:border-blue-500/60",
      hoverDividerClass: "group-hover:border-blue-400/90",
    };
  }

  if (mediatype === "special") {
    return {
      badgeClass: "bg-green-500/50 text-green-100",
      hoverBorderClass: "group-hover:border-green-500/60",
      hoverDividerClass: "group-hover:border-green-400/90",
    };
  }

  return {
    badgeClass: "bg-red-500/50 text-red-100",
    hoverBorderClass: "group-hover:border-red-500/60",
    hoverDividerClass: "group-hover:border-red-400/90",
  };
}

export function AllMediaPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const [media, setMedia] = useState<Media[]>([]);
  const [universeMetadata, setUniverseMetadata] = useState<Record<string, UniverseMetadata>>({});
  const [sagaMetadata, setSagaMetadata] = useState<Record<string, SagaMetadata>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUniverse, setSelectedUniverse] = useState<string | null>(null);
  const pendingScrollTargetRef = useRef<string | null>(null);

  const resolvePosterUrl = (poster: string): string => {
    if (poster.startsWith("http://") || poster.startsWith("https://")) {
      return poster;
    }
    const normalizedPoster = poster.startsWith("/") ? poster : `/${poster}`;
    return `${apiUrl}${normalizedPoster}`;
  };

  useEffect(() => {
    const fetchMedia = async () => {
      try {
        const [mediaResponse, universesResponse, sagasResponse] = await Promise.all([
          fetch(`${apiUrl}/api/v1/media`),
          fetch(`${apiUrl}/api/v1/universes`),
          fetch(`${apiUrl}/api/v1/sagas`),
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

        setMedia(mediaData);
        setUniverseMetadata(
          Object.fromEntries(universesData.map((universe) => [universe.id, universe])) as Record<string, UniverseMetadata>,
        );
        setSagaMetadata(
          Object.fromEntries(sagasData.map((saga) => [saga.id, saga])) as Record<string, SagaMetadata>,
        );
      } catch (err) {
        const message =
          err instanceof TypeError
            ? `Unable to reach API at ${apiUrl}. Start the backend and check CORS settings.`
            : err instanceof Error
              ? err.message
              : "Failed to fetch media";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchMedia();
  }, [apiUrl]);

  const universeOptions = useMemo<UniverseOption[]>(() => {
    const grouped = new Map<string, number>();

    for (const item of media) {
      const key = item.universe;
      grouped.set(key, (grouped.get(key) ?? 0) + 1);
    }

    return [...grouped.entries()]
      .map(([key, count]) => ({
        key,
        title: universeMetadata[key]?.short_name ?? "Unknown",
        count,
        order: universeMetadata[key]?.order ?? Number.MAX_SAFE_INTEGER,
        color: universeMetadata[key]?.color ?? "#71717a",
      }))
      .sort((left, right) => {
        if (left.order !== right.order) {
          return left.order - right.order;
        }

        return left.title.localeCompare(right.title);
      });
  }, [media, universeMetadata]);

  useEffect(() => {
    if (universeOptions.length === 0) {
      return;
    }

    const syncUniverseFromHash = () => {
      const hashValue = decodeURIComponent(window.location.hash.replace(/^#/, ""));
      const [universeKey, sagaKey] = hashValue.split("__");

      if (universeKey && universeOptions.some((option) => option.key === universeKey)) {
        setSelectedUniverse(universeKey);
        pendingScrollTargetRef.current = sagaKey ? `${universeKey}__${sagaKey}` : null;
        return true;
      }

      pendingScrollTargetRef.current = null;

      return false;
    };

    const hasValidHash = syncUniverseFromHash();

    if (!hasValidHash && (!selectedUniverse || !universeOptions.some((option) => option.key === selectedUniverse))) {
      const fallbackUniverse = universeOptions[0].key;
      setSelectedUniverse(fallbackUniverse);
      window.history.replaceState(null, "", `#${fallbackUniverse}`);
    }

    window.addEventListener("hashchange", syncUniverseFromHash);

    return () => {
      window.removeEventListener("hashchange", syncUniverseFromHash);
    };
  }, [selectedUniverse, universeOptions]);

  const selectedUniverseMedia = useMemo(() => {
    if (!selectedUniverse) {
      return [];
    }

    return media.filter((item) => item.universe === selectedUniverse);
  }, [media, selectedUniverse]);

  const sagaGroups = useMemo<SagaGroup[]>(() => {
    const grouped = new Map<string, Media[]>();

    for (const item of selectedUniverseMedia) {
      const key = item.saga ?? "unassigned-saga";
      const current = grouped.get(key) ?? [];
      current.push(item);
      grouped.set(key, current);
    }

    const groups = [...grouped.entries()].map(([key, items]) => ({
      key,
      title: sagaMetadata[key]?.name ?? `Standalone${items.length > 1 ? "s" : ""}`,
      order: sagaMetadata[key]?.order ?? Number.MAX_SAFE_INTEGER,
      description: sagaMetadata[key]?.description ?? "",
      items: [...items].sort(
        (left, right) => new Date(left.release_date).getTime() - new Date(right.release_date).getTime(),
      ),
    }));

    return groups.sort((left, right) => {
      if (left.order !== right.order) {
        return left.order - right.order;
      }

      const leftOldest = left.items[0] ? new Date(left.items[0].release_date).getTime() : Number.MAX_SAFE_INTEGER;
      const rightOldest = right.items[0] ? new Date(right.items[0].release_date).getTime() : Number.MAX_SAFE_INTEGER;

      if (leftOldest !== rightOldest) {
        return leftOldest - rightOldest;
      }

      return left.title.localeCompare(right.title);
    });
  }, [sagaMetadata, selectedUniverseMedia]);

  useEffect(() => {
    if (!pendingScrollTargetRef.current) {
      return;
    }

    const targetElement = document.getElementById(pendingScrollTargetRef.current);

    if (targetElement) {
      targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
      pendingScrollTargetRef.current = null;
    }
  }, [selectedUniverse, sagaGroups]);

  return (
    <div className="min-h-screen bg-linear-to-b from-black via-zinc-950 to-black text-zinc-100">
      <AppNavbar />

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:py-8">
        <section className="mb-6 rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-red-400 sm:text-left">The Complete Marvel Collection</p>
          <h1 className="mt-3 text-center text-3xl font-black leading-tight text-white sm:text-left sm:text-4xl md:text-5xl">
            A multiverse of stories awaits
          </h1>
          <p className="mx-auto mt-4 max-w-3xl text-center text-zinc-300 sm:mx-0 sm:text-left">Explore every Marvel sagas across worlds and universes</p>

          <div className="mt-5 flex flex-wrap justify-center gap-2 sm:justify-start">
            {universeOptions.map((option) => {
              const isActive = selectedUniverse === option.key;
              return (
                <a
                  key={option.key}
                  href={`#${option.key}`}
                  onClick={() => setSelectedUniverse(option.key)}
                  className={`cursor-pointer rounded-full border px-4 py-2 text-sm font-semibold transition duration-200 hover:-translate-y-0.5 hover:brightness-110 ${
                    isActive
                      ? "text-white"
                      : "bg-zinc-900/60 hover:text-white"
                  }`}
                  style={
                    isActive
                      ? {
                          borderColor: option.color,
                          backgroundColor: hexToRgba(option.color, 0.2),
                        }
                      : {
                          borderColor: hexToRgba(option.color, 0.45),
                          color: option.color,
                        }
                  }
                >
                  {option.title} ({option.count})
                </a>
              );
            })}
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
          <div className="space-y-8">
            {sagaGroups.map((group) => (
              <section
                key={group.key}
                id={selectedUniverse ? `${selectedUniverse}__${group.key}` : undefined}
                className="space-y-3 scroll-mt-24 md:scroll-mt-28 lg:scroll-mt-32"
              >
                <div className="flex flex-col flex-wrap items-center justify-center gap-3 py-4 sm:gap-4 sm:py-5">
                    <h2 className="text-center text-2xl font-bold text-white sm:text-3xl">{group.title}</h2>
                    <p className="text-center text-sm text-zinc-400 sm:text-base">
                      {group.description}
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8">
                  {group.items.map((item, index) => {
                    const mediaTypeStyles = getMediaTypeStyles(item.mediatype);

                    return (
                      <Link
                        key={item.id}
                        href={`/media/${item.id}`}
                        className="group mx-auto w-full max-w-36 sm:max-w-32"
                      >
                        <article className={`relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/70 transition-transform duration-200 group-hover:-translate-y-0.5 ${mediaTypeStyles.hoverBorderClass}`}>
                          <div className="relative aspect-2/3 bg-zinc-800">
                            <Image
                              src={resolvePosterUrl(item.poster)}
                              alt={item.title}
                              fill
                              className="object-cover"
                              sizes="(max-width: 640px) 45vw, (max-width: 1024px) 24vw, 120px"
                              unoptimized
                            />
                            <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/20 to-transparent" />
                            <span className={`absolute left-1.5 top-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-semibold tracking-wide transition-opacity duration-300 group-hover:opacity-0 ${mediaTypeStyles.badgeClass}`}>
                              {formatMediaTypeLabel(item.mediatype)}
                            </span>
                          </div>

                          <div className="absolute inset-x-0 bottom-0 p-2 pt-7">
                            <div className={`border-b border-zinc-600/90 pb-1 transition-colors duration-300 ${mediaTypeStyles.hoverDividerClass}`}>
                              <h3 className="line-clamp-2 text-[11px] font-semibold leading-tight text-white">
                                {group.key === "unassigned-saga" ? item.title : `${index + 1}. ${item.title}`}
                              </h3>
                            </div>
                            <div className="mt-1 max-h-0 overflow-hidden opacity-0 transition-all duration-300 group-hover:max-h-14 group-hover:opacity-100">
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
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}