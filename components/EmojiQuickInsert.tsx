"use client";

const DEFAULT_EMOJIS = ["😀", "👍", "👏", "🙏", "🔥", "💡", "✅", "⚠️", "📌", "🗳️"] as const;

export function EmojiQuickInsert({
  onPick,
  emojis = DEFAULT_EMOJIS,
  label = "Quick emoji",
}: {
  onPick: (emoji: string) => void;
  emojis?: readonly string[];
  label?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-brand-muted">{label}:</span>
      {emojis.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onPick(emoji)}
          className="rounded-md border border-white/15 px-2 py-1 text-sm leading-none transition hover:border-brand-accent/50 hover:bg-white/10"
          aria-label={`Insert ${emoji}`}
          title={`Insert ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
