#!/usr/bin/env python3
"""One-off: replace generic Tailwind blue/sky with logo-aligned brand tokens. Run from repo root."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EXTS = {".tsx", ".ts", ".css"}

# Longer / more specific keys first
REPLACEMENTS: list[tuple[str, str]] = [
    # Sky → logo-cyan / brand-accent-bright washes
    ("border-sky-200/80 bg-sky-50/70 dark:border-sky-400/30 dark:bg-sky-950/20", "border-logo-cyan/35 bg-logo-cyan/12 dark:border-logo-cyan/35 dark:bg-logo-cyan/12"),
    ("border-sky-300/40 bg-sky-50/40", "border-logo-cyan/35 bg-logo-cyan/10"),
    ("border-sky-400/20 bg-gradient-to-br from-sky-500/[0.1] via-brand-paper/50 to-blue-500/[0.08]", "border-logo-cyan/30 bg-gradient-to-br from-logo-cyan/[0.12] via-brand-paper/50 to-logo-blue/[0.08]"),
    ("from-sky-500/[0.1]", "from-logo-cyan/[0.12]"),
    ("to-blue-500/[0.08]", "to-logo-blue/[0.08]"),
    ("border-sky-400/20", "border-logo-cyan/30"),
    ("from-sky-500/25 to-sky-600/5 border-sky-400/20", "from-logo-cyan/22 to-logo-blue/8 border-logo-cyan/28"),
    ("bg-sky-300 dark:bg-sky-900", "bg-logo-cyan/55 dark:bg-logo-blue/40"),
    ("bg-sky-50/70", "bg-logo-cyan/12"),
    ("bg-sky-50/65", "bg-logo-cyan/11"),
    ("bg-sky-50/60", "bg-logo-cyan/10"),
    ("bg-sky-50/55", "bg-logo-cyan/9"),
    ("bg-sky-50/40", "bg-logo-cyan/8"),
    ("bg-sky-50/35", "bg-logo-cyan/7"),
    ("border-sky-300/40", "border-logo-cyan/35"),
    # Blue compounds (dark)
    ("dark:border-blue-500/40 dark:bg-blue-950/30 dark:text-blue-100", "dark:border-brand-accent/40 dark:bg-brand-accent/14 dark:text-brand-accent-bright"),
    ("dark:border-blue-600 dark:bg-blue-950/50 dark:text-blue-100", "dark:border-brand-accent/45 dark:bg-brand-accent/16 dark:text-brand-accent-bright"),
    ("dark:border-blue-600 dark:bg-blue-950/40 dark:text-blue-100", "dark:border-brand-accent/45 dark:bg-brand-accent/14 dark:text-brand-accent-bright"),
    ("dark:border-blue-500/30 dark:bg-blue-950/20 dark:text-blue-100", "dark:border-brand-accent/35 dark:bg-brand-accent/12 dark:text-brand-accent-bright"),
    ("dark:bg-blue-950/70 dark:text-blue-200", "dark:bg-brand-accent/18 dark:text-brand-accent-bright"),
    ("dark:bg-blue-950/60 dark:text-blue-200", "dark:bg-brand-accent/16 dark:text-brand-accent-bright"),
    ("dark:bg-blue-950/55 dark:text-blue-100", "dark:bg-brand-accent/16 dark:text-brand-accent-bright"),
    ("dark:bg-blue-950/50 dark:text-blue-200", "dark:bg-brand-accent/14 dark:text-brand-accent-bright"),
    ("dark:bg-blue-900 text-blue-800 dark:text-blue-200", "dark:bg-brand-accent/20 text-brand-navy dark:text-brand-accent-bright"),
    ("dark:bg-blue-950/40", "dark:bg-brand-accent/12"),
    ("dark:bg-blue-950/30", "dark:bg-brand-accent/10"),
    ("dark:bg-blue-950/20", "dark:bg-brand-accent/10"),
    ("dark:hover:bg-blue-950/30", "dark:hover:bg-brand-accent/12"),
    ("dark:hover:border-blue-500/40", "dark:hover:border-brand-accent/40"),
    ("dark:hover:bg-blue-950/30", "dark:hover:bg-brand-accent/12"),
    ("dark:text-blue-400 dark:decoration-blue-400/40", "dark:text-brand-accent-bright dark:decoration-brand-accent-bright/45"),
    ("dark:text-blue-400", "dark:text-brand-accent-bright"),
    ("dark:text-blue-300", "dark:text-brand-accent-bright"),
    ("dark:text-blue-200", "dark:text-brand-accent-bright"),
    ("dark:text-blue-100", "dark:text-brand-accent-bright"),
    ("dark:border-blue-500", "dark:border-brand-accent"),
    ("dark:border-blue-400/30", "dark:border-brand-accent/35"),
    ("dark:bg-blue-900", "dark:bg-brand-accent/25"),
    ("dark:hover:bg-blue-500", "dark:hover:opacity-90"),
    ("dark:bg-blue-600 dark:hover:bg-blue-500", "dark:bg-brand-accent dark:hover:opacity-90"),
    # Hover / buttons
    ("hover:bg-blue-700 disabled:opacity-50", "hover:opacity-90 disabled:opacity-50"),
    ("hover:bg-blue-700", "hover:opacity-90"),
    ("hover:bg-blue-600", "hover:opacity-90"),
    ("hover:bg-blue-600 disabled:opacity-50", "hover:opacity-90 disabled:opacity-50"),
    ("hover:border-blue-300 hover:bg-blue-50/50", "hover:border-brand-accent/35 hover:bg-brand-accent/8"),
    ("hover:border-blue-300", "hover:border-brand-accent/35"),
    ("hover:decoration-blue-700", "hover:decoration-brand-diplomatic"),
    ("group-hover:border-blue-200 group-hover:bg-slate-50 group-hover:text-blue-700", "group-hover:border-brand-accent/25 group-hover:bg-brand-accent/6 group-hover:text-brand-diplomatic"),
    ("group-hover:border-blue-500/30", "group-hover:border-brand-accent/35"),
    # Backgrounds light
    ("bg-blue-950/40", "bg-brand-accent/14"),
    ("bg-blue-100 text-blue-900", "bg-brand-accent/15 text-brand-navy"),
    ("bg-blue-50/70", "bg-brand-accent/11"),
    ("bg-blue-50/60", "bg-brand-accent/10"),
    ("bg-blue-50/50", "bg-brand-accent/9"),
    ("bg-blue-50/40", "bg-brand-accent/8"),
    ("bg-blue-50", "bg-brand-accent/10"),
    ("bg-blue-100", "bg-brand-accent/15"),
    ("bg-blue-600", "bg-brand-accent"),
    ("bg-blue-700", "bg-brand-accent"),
    ("bg-blue-500/15", "bg-brand-accent/15"),
    # Text
    ("text-blue-950", "text-brand-navy"),
    ("text-blue-900/80", "text-brand-navy/85"),
    ("text-blue-900", "text-brand-navy"),
    ("text-blue-800", "text-brand-navy"),
    ("text-blue-700", "text-brand-diplomatic"),
    ("text-blue-600", "text-brand-diplomatic"),
    ("text-blue-500", "text-brand-accent"),
    ("text-blue-100", "text-brand-accent-bright"),
    ("text-blue-200", "text-brand-accent-bright"),
    # Borders
    ("border-blue-900/50", "border-brand-accent/45"),
    ("border-blue-400/35", "border-brand-accent/35"),
    ("border-blue-400/30", "border-brand-accent/32"),
    ("border-blue-300/80", "border-brand-accent/35"),
    ("border-blue-300/40", "border-brand-accent/32"),
    ("border-blue-300", "border-brand-accent/32"),
    ("border-blue-200/70", "border-brand-accent/28"),
    ("border-blue-200/50", "border-brand-accent/25"),
    ("border-blue-200", "border-brand-accent/25"),
    ("border-blue-100", "border-brand-accent/22"),
    ("border-blue-400", "border-brand-accent/38"),
    ("border-blue-500/40", "border-brand-accent/40"),
    ("border-blue-600", "border-brand-accent"),
    # Focus rings
    ("focus:ring-blue-500/25", "focus:ring-brand-accent/25"),
    ("focus:ring-blue-500/30", "focus:ring-brand-accent/30"),
    ("focus:border-blue-500", "focus:border-brand-accent"),
    ("focus:ring-blue-500", "focus:ring-brand-accent"),
    ("text-blue-600 focus:ring-blue-500", "text-brand-accent focus:ring-brand-accent"),
    ("text-blue-700 focus:ring-blue-500", "text-brand-diplomatic focus:ring-brand-accent"),
    # Gradients & misc
    ("from-blue-500/25 to-blue-600/5 border-blue-400/20", "from-brand-accent/22 to-logo-blue/8 border-brand-accent/28"),
    ("to-blue-600/12", "to-brand-accent/12"),
    ("to-blue-600/10", "to-brand-accent/10"),
    ("to-blue-950/8", "to-brand-navy/8"),
    ("from-blue-600/22", "from-brand-accent/22"),
    ("decoration-blue-700/30", "decoration-brand-diplomatic/35"),
    ("decoration-blue-700", "decoration-brand-diplomatic"),
    ("shadow-blue-500/10", "shadow-brand-accent/12"),
    ("text-blue-400/90", "text-brand-accent-bright/95"),
    # ThemeSelector swatch
    ("bg-blue-600", "bg-brand-accent"),
    # Indigo → logo blue (committee “Traditional” is brand-aligned)
    ("border-indigo-400/65 bg-indigo-100 text-indigo-950 dark:border-indigo-500/40 dark:bg-indigo-950/55 dark:text-indigo-50", "border-brand-accent/50 bg-brand-accent/14 text-brand-navy dark:border-brand-accent/45 dark:bg-brand-accent/18 dark:text-brand-accent-bright"),
    # Cyan pills → logo-cyan
    ("border-cyan-400/65 bg-cyan-100 text-cyan-950 dark:border-cyan-500/40 dark:bg-cyan-950/55 dark:text-cyan-50", "border-logo-cyan/50 bg-logo-cyan/14 text-brand-navy dark:border-logo-cyan/45 dark:bg-logo-cyan/16 dark:text-brand-accent-bright"),
]

# Second pass: simpler leftovers (after compounds)
FINAL_PASS: list[tuple[str, str]] = [
    ("text-blue-400", "text-brand-accent-bright"),
    ("bg-blue-400", "bg-logo-cyan/50"),
    ("dark:bg-blue-900", "dark:bg-brand-accent/35"),
]


def main() -> int:
    changed = 0
    for path in sorted(ROOT.rglob("*")):
        if path.suffix not in EXTS or "node_modules" in path.parts or ".next" in path.parts:
            continue
        if path.name == "sweep-logo-colors.py":
            continue
        text = path.read_text(encoding="utf-8")
        orig = text
        for old, new in REPLACEMENTS:
            text = text.replace(old, new)
        for old, new in FINAL_PASS:
            text = text.replace(old, new)
        if text != orig:
            path.write_text(text, encoding="utf-8")
            changed += 1
            print(path.relative_to(ROOT))
    print(f"Updated {changed} files")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
