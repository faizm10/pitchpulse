"use client";

import { useNews } from "@/hooks/useNews";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 36e5);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function SkeletonCard({
  className,
}: {
  className: string;
}) {
  return (
    <div
      className={[
        "overflow-hidden rounded-2xl border border-white/8 bg-white/2",
        className,
      ].join(" ")}
    >
      <div className="h-full w-full animate-pulse">
        <div className="h-40 w-full bg-white/5" />
        <div className="space-y-2 p-4">
          <div className="h-3 w-4/5 rounded bg-white/10" />
          <div className="h-3 w-2/5 rounded bg-white/10" />
          <div className="h-3 w-3/5 rounded bg-white/10" />
        </div>
      </div>
    </div>
  );
}

function NewsBentoCard({
  headline,
  description,
  imageUrl,
  url,
  published,
  byline,
  compact = false,
  className,
}: {
  headline: string;
  description?: string;
  imageUrl?: string | null;
  url: string;
  published: string;
  byline?: string | null;
  compact?: boolean;
  className: string;
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={[
        "group relative overflow-hidden rounded-2xl border border-white/8 bg-white/2 transition",
        "hover:bg-white/4",
        className,
      ].join(" ")}
    >
      {imageUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center opacity-90 transition group-hover:opacity-100"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/30 to-black/10" />
        </>
      ) : (
        <div className="absolute inset-0 bg-linear-to-br from-white/6 via-white/2 to-transparent" />
      )}

      <div className="relative flex h-full flex-col justify-end p-4">
        <div className="inline-flex w-fit max-w-full items-center gap-2 rounded-full border border-white/10 bg-black/35 px-2.5 py-1 text-[11px] font-medium tracking-wide text-white/90 backdrop-blur-md shadow-sm shadow-black/20">
          <span className="h-1 w-1 rounded-full bg-white/70" />
          <span>{timeAgo(published)}</span>
        </div>

        <p
          className={[
            "mt-3 text-neutral-100",
            compact
              ? "line-clamp-2 text-sm font-semibold leading-snug"
              : "line-clamp-3 text-base font-semibold leading-snug",
          ].join(" ")}
        >
          {headline}
        </p>

        {!compact && description && (
          <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-neutral-300/90">
            {description}
          </p>
        )}

        {byline && !compact && (
          <p className="mt-3 text-[10px] uppercase tracking-[0.18em] text-neutral-400/90">
            {byline}
          </p>
        )}
      </div>
    </a>
  );
}

export function NewsPageClient() {
  const { articles, loading, error, lastUpdated } = useNews();

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-6">
        <SkeletonCard className="md:col-span-4 md:row-span-2" />
        <SkeletonCard className="md:col-span-2 md:row-span-1" />
        <SkeletonCard className="md:col-span-2 md:row-span-1" />
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} className="md:col-span-2" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <section className="overflow-hidden rounded-xl border border-white/8 bg-black/25">
        <div className="border-b border-white/8 px-4 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
            Headlines
          </p>
        </div>
        <div className="p-4 text-sm text-neutral-400">{error}</div>
      </section>
    );
  }

  if (articles.length === 0) {
    return (
      <section className="overflow-hidden rounded-xl border border-white/8 bg-black/25">
        <div className="border-b border-white/8 px-4 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
            Headlines
          </p>
        </div>
        <div className="p-4 text-sm text-neutral-500">
          No news articles are available right now.
        </div>
      </section>
    );
  }

  const featured = articles[0];
  const second = articles[1];
  const third = articles[2];
  const rest = articles.slice(3);

  return (
    <div className="space-y-4">
      {lastUpdated && (
        <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-600">
          Updated{" "}
          {lastUpdated.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      )}

      <div className="grid auto-rows-[10rem] gap-4 md:grid-cols-6 md:auto-rows-[9rem]">
        <NewsBentoCard
          className="md:col-span-4 md:row-span-3"
          headline={featured.headline}
          description={featured.description}
          imageUrl={featured.imageUrl}
          url={featured.url}
          published={featured.published}
          byline={featured.byline}
        />

        {second && (
          <NewsBentoCard
            className="md:col-span-2 md:row-span-2"
            headline={second.headline}
            description={second.description}
            imageUrl={second.imageUrl}
            url={second.url}
            published={second.published}
            byline={second.byline}
          />
        )}

        {third && (
          <NewsBentoCard
            className="md:col-span-2 md:row-span-1"
            compact
            headline={third.headline}
            description={third.description}
            imageUrl={third.imageUrl}
            url={third.url}
            published={third.published}
            byline={third.byline}
          />
        )}

        {rest.map((article, index) => (
          (() => {
            const className =
              index % 7 === 0
                ? "md:col-span-3 md:row-span-2"
                : index % 7 === 3
                  ? "md:col-span-3 md:row-span-1"
                  : "md:col-span-2 md:row-span-1";
            const compact = className.includes("md:row-span-1");

            return (
          <NewsBentoCard
            key={article.id}
            className={className}
            compact={compact}
            headline={article.headline}
            description={article.description}
            imageUrl={article.imageUrl}
            url={article.url}
            published={article.published}
            byline={article.byline}
          />
            );
          })()
        ))}
      </div>
    </div>
  );
}

