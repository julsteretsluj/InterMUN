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
    <section
      className="min-h-screen w-full p-4 md:p-6 lg:p-8"
      style={{
        background:
          "radial-gradient(circle at top left, color-mix(in srgb, var(--brand-gold) 35%, transparent) 0%, rgba(10,10,10,0.92) 40%), radial-gradient(circle at bottom right, color-mix(in srgb, var(--brand-gold) 26%, transparent) 0%, rgba(10,10,10,0.96) 45%), linear-gradient(135deg, #111111 0%, #0a0a0a 100%)",
        fontFamily: "Inter, Montserrat, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif",
      }}
    >
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
            Home
          </h1>
          <p className="mt-1 text-sm md:text-base text-white/70">
            Good evening. Jump back in.
          </p>
        </header>

        <div className="grid grid-cols-12 gap-4 md:gap-5">
          {CARDS.map((card) => (
            <article
              key={card.id}
              className={[
                card.span,
                "group min-h-36 md:min-h-40 rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.05)] p-4 md:p-5",
                "transition-all duration-200 ease-out hover:-translate-y-1 hover:bg-[rgba(255,255,255,0.09)]",
              ].join(" ")}
            >
              <h2 className="text-base md:text-lg font-bold text-white">
                {card.title}
              </h2>
              <p className="mt-1 text-sm text-white/70 group-hover:text-white/80">
                {card.subtitle}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

