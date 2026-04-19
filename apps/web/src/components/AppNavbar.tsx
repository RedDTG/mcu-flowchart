"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { apiV1Path } from "../lib/api";

interface SearchMedia {
  id: string;
  title: string;
  mediatype: "movie" | "show" | "special";
  release_date: string;
}

const pageLinks = [
  { href: "/", label: "Home" },
  { href: "/all-media", label: "Explore" },
  // { href: "/watching-map", label: "Watching Map" },
  // { href: "/watching-order", label: "Watching Order" },
] as const;

function getMediaTypeTextClass(mediatype: SearchMedia["mediatype"]) {
  if (mediatype === "show") {
    return "text-blue-400";
  }

  if (mediatype === "special") {
    return "text-green-400";
  }

  return "text-red-400";
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6L6 18" />
      <path d="M6 6l12 12" />
    </svg>
  );
}

function useDebouncedValue(value: string, delayMs: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [delayMs, value]);

  return debouncedValue;
}

export function AppNavbar() {
  const pathname = usePathname();
  const router = useRouter();

  const [allMedia, setAllMedia] = useState<SearchMedia[]>([]);
  const [desktopQuery, setDesktopQuery] = useState("");
  const [mobileQuery, setMobileQuery] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearchLoading, setIsSearchLoading] = useState(true);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const debouncedDesktopQuery = useDebouncedValue(desktopQuery, 120);
  const debouncedMobileQuery = useDebouncedValue(mobileQuery, 120);

  useEffect(() => {
    const fetchMedia = async () => {
      setIsSearchLoading(true);
      try {
        const response = await fetch(apiV1Path("/media"));
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        const data = (await response.json()) as SearchMedia[];
        setAllMedia(data);
        setSearchError(null);
      } catch {
        setSearchError("Search unavailable");
      } finally {
        setIsSearchLoading(false);
      }
    };

    fetchMedia();
  }, []);

  const resolveResults = (query: string) => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return [];
    }

    return allMedia
      .filter((item) => item.title.toLowerCase().includes(normalizedQuery))
      .sort((left, right) => new Date(right.release_date).getTime() - new Date(left.release_date).getTime())
      .slice(0, 8);
  };

  const desktopResults = useMemo(() => resolveResults(debouncedDesktopQuery), [allMedia, debouncedDesktopQuery]);
  const mobileResults = useMemo(() => resolveResults(debouncedMobileQuery), [allMedia, debouncedMobileQuery]);
  const mobileDefaultSuggestions = useMemo(
    () => [...allMedia]
      .sort((left, right) => new Date(right.release_date).getTime() - new Date(left.release_date).getTime())
      .slice(0, 8),
    [allMedia],
  );

  const navigateToFirstResult = (results: SearchMedia[]) => {
    if (results.length === 0) {
      return;
    }

    router.push(`/media/${results[0].id}`);
  };

  const handleDesktopSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigateToFirstResult(desktopResults);
    setDesktopQuery("");
  };

  const handleMobileSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigateToFirstResult(mobileResults);
    setMobileQuery("");
    setIsMobileSearchOpen(false);
  };

  useEffect(() => {
    if (!isMobileSearchOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileSearchOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isMobileSearchOpen]);

  useEffect(() => {
    if (!isMobileSearchOpen) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileSearchOpen]);

  return (
    <>
    <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-black/75 backdrop-blur">
      <nav className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-3 px-4 py-4 md:grid-cols-[1fr_auto_1fr] md:gap-4">
        <div className="flex items-center justify-between md:justify-self-start">
          <Link href="/" className="text-lg font-black tracking-tight text-white">
            <span>MCU </span>
            <span className="font-sans font-bold text-red-400">Flowchart</span>
          </Link>

          <button
            type="button"
            onClick={() => setIsMobileSearchOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900/80 text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800 md:hidden"
            aria-label="Open search"
          >
            <SearchIcon />
          </button>
        </div>

        <div className="flex items-center justify-start gap-4 overflow-x-auto whitespace-nowrap pb-1 text-sm text-zinc-300 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:justify-center md:gap-5 md:pb-0">
          {pageLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`transition hover:text-white ${isActive ? "text-white" : "text-zinc-300"}`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        <div className="relative hidden justify-self-end md:block md:w-full md:max-w-sm">
          <form onSubmit={handleDesktopSubmit} className="flex items-center gap-2">
            <input
              type="search"
              value={desktopQuery}
              onChange={(event) => setDesktopQuery(event.target.value)}
              placeholder="Search a title..."
              className="w-full rounded-full border border-zinc-700 bg-zinc-900/80 px-4 py-2 text-sm text-zinc-100 outline-none transition focus:border-zinc-500"
              aria-label="Search media"
            />
          </form>

          {debouncedDesktopQuery.trim().length > 0 && (
            <div className="absolute right-0 z-50 mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950/95 p-2 shadow-2xl">
              {desktopResults.length > 0 ? (
                <ul className="space-y-1">
                  {desktopResults.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={`/media/${item.id}`}
                        onClick={() => setDesktopQuery("")}
                        className="block rounded-lg px-3 py-2 text-sm text-zinc-200 transition hover:bg-zinc-900 hover:text-white"
                      >
                        <span className={`font-semibold ${getMediaTypeTextClass(item.mediatype)}`}>{item.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-3 py-2 text-sm text-zinc-400">No results</p>
              )}
              {searchError && <p className="px-3 pb-1 pt-2 text-xs text-zinc-500">{searchError}</p>}
            </div>
          )}
        </div>
      </nav>
    </header>

      {isMobileSearchOpen && (
        <div className="fixed inset-0 z-90 bg-black/80 backdrop-blur-sm md:hidden">
          <div className="mx-auto flex h-dvh w-full max-w-3xl flex-col px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Search</p>
              <button
                type="button"
                onClick={() => {
                  setIsMobileSearchOpen(false);
                  setMobileQuery("");
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900/90 text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800"
                aria-label="Close search"
              >
                <CloseIcon />
              </button>
            </div>

            <form onSubmit={handleMobileSubmit} className="rounded-2xl border border-zinc-800 bg-zinc-950/95 p-3">
              <div className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/80 px-3">
                <SearchIcon />
                <input
                  type="search"
                  value={mobileQuery}
                  onChange={(event) => setMobileQuery(event.target.value)}
                  placeholder="Search a title..."
                  className="h-11 w-full bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
                  aria-label="Search media"
                  autoFocus
                />
              </div>
            </form>

            <div className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950/95 p-2">
              {isSearchLoading ? (
                <p className="px-3 py-2 text-sm text-zinc-500">Loading suggestions...</p>
              ) : debouncedMobileQuery.trim().length === 0 && mobileDefaultSuggestions.length > 0 ? (
                <>
                  <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Suggested titles</p>
                  <ul className="space-y-1">
                    {mobileDefaultSuggestions.map((item) => (
                      <li key={item.id}>
                        <Link
                          href={`/media/${item.id}`}
                          onClick={() => {
                            setMobileQuery("");
                            setIsMobileSearchOpen(false);
                          }}
                          className="block rounded-lg px-3 py-2 text-sm text-zinc-200 transition hover:bg-zinc-900 hover:text-white"
                        >
                          <span className={`font-semibold ${getMediaTypeTextClass(item.mediatype)}`}>{item.title}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              ) : debouncedMobileQuery.trim().length > 0 && mobileResults.length > 0 ? (
                <ul className="space-y-1">
                  {mobileResults.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={`/media/${item.id}`}
                        onClick={() => {
                          setMobileQuery("");
                          setIsMobileSearchOpen(false);
                        }}
                        className="block rounded-lg px-3 py-2 text-sm text-zinc-200 transition hover:bg-zinc-900 hover:text-white"
                      >
                        <span className={`font-semibold ${getMediaTypeTextClass(item.mediatype)}`}>{item.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : debouncedMobileQuery.trim().length > 0 ? (
                <p className="px-3 py-2 text-sm text-zinc-400">No results</p>
              ) : (
                <p className="px-3 py-2 text-sm text-zinc-500">Start typing to search titles.</p>
              )}

              {searchError && <p className="px-3 pb-1 pt-2 text-xs text-zinc-500">{searchError}</p>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}