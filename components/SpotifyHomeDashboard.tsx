"use client";

type DashboardCard = {
  id: string;
  title: string;
  subtitle: string;
  span: string;
};

const CARDS: DashboardCard[] = [
  {
    id: "recent",
    title: "Recently Played",
    subtitle: "Pick up where you left off.",
    span: "col-span-12 md:col-span-8 lg:col-span-6",
  },
  {
    id: "mixes",
    title: "Your Mixes",
    subtitle: "Fresh playlists based on your taste.",
    span: "col-span-12 md:col-span-4 lg:col-span-3",
  },
  {
    id: "discover",
    title: "Discover Weekly",
    subtitle: "New songs curated for you.",
    span: "col-span-12 md:col-span-6 lg:col-span-3",
  },
  {
    id: "made-for-you",
    title: "Made For You",
    subtitle: "Daily picks and mood boosters.",
    span: "col-span-12 md:col-span-6 lg:col-span-4",
  },
  {
    id: "trending",
    title: "Trending Now",
    subtitle: "What everyone is listening to.",
    span: "col-span-12 md:col-span-6 lg:col-span-5",
  },
  {
    id: "library",
    title: "Your Library",
    subtitle: "Albums, artists, and saved tracks.",
    span: "col-span-12 md:col-span-6 lg:col-span-3",
  },
];

export function SpotifyHomeDashboard() {
  return (
    <section className="min-h-screen w-full bg-[var(--background)] p-4 font-sans md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 md:mb-8">
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[var(--foreground)] md:text-3xl">Home</h1>
          <p className="mt-1 text-sm text-brand-muted md:text-base">Good evening. Jump back in.</p>
        </header>

        <div className="grid grid-cols-12 gap-4 md:gap-5">
          {CARDS.map((card) => (
            <article
              key={card.id}
              className={[
                card.span,
                "group min-h-36 rounded-[var(--radius-2xl)] border border-[var(--hairline)] bg-[var(--material-thick)] p-4 shadow-[0_8px_28px_-16px_rgba(0,0,0,0.15)] backdrop-blur-xl transition-apple",
                "md:min-h-40 md:p-5",
                "hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-14px_rgba(0,0,0,0.2)] active:scale-[0.99]",
              ].join(" ")}
            >
              <h2 className="text-base font-semibold text-[var(--foreground)] md:text-lg">{card.title}</h2>
              <p className="mt-1 text-sm text-brand-muted transition-apple group-hover:text-[var(--color-text-secondary)]">
                {card.subtitle}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
