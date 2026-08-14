// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

import type { OfficialLinkDef } from "@/lib/official-un-links";

/**
 * SEAMUN I 2027 Press Corps seats (`allocations.country`) with three distinct
 * news pieces each — world / health / features desks matching the chamber topic.
 */
export const PRESS_CORPS_ALLOCATION_NEWS: readonly {
  outlet: string;
  pieces: readonly { title: string; href: string }[];
}[] = [
  {
    outlet: "Al Jazeera",
    pieces: [
      { title: "Al Jazeera — World", href: "https://www.aljazeera.com/news/" },
      { title: "Al Jazeera — Health", href: "https://www.aljazeera.com/tag/health/" },
      { title: "Al Jazeera — Features", href: "https://www.aljazeera.com/features/" },
    ],
  },
  {
    outlet: "BBC News",
    pieces: [
      { title: "BBC News — World", href: "https://www.bbc.com/news/world" },
      { title: "BBC News — Health", href: "https://www.bbc.com/news/health" },
      { title: "BBC News — In depth", href: "https://www.bbc.com/news/in-depth" },
    ],
  },
  {
    outlet: "CNN",
    pieces: [
      { title: "CNN — World", href: "https://www.cnn.com/world" },
      { title: "CNN — Health", href: "https://www.cnn.com/health" },
      { title: "CNN — Politics", href: "https://www.cnn.com/politics" },
    ],
  },
  {
    outlet: "Fox News",
    pieces: [
      { title: "Fox News — World", href: "https://www.foxnews.com/world" },
      { title: "Fox News — Health", href: "https://www.foxnews.com/health" },
      { title: "Fox News — Politics", href: "https://www.foxnews.com/politics" },
    ],
  },
  {
    outlet: "NPR",
    pieces: [
      { title: "NPR — World", href: "https://www.npr.org/sections/world/" },
      { title: "NPR — Health", href: "https://www.npr.org/sections/health/" },
      { title: "NPR — Politics", href: "https://www.npr.org/sections/politics/" },
    ],
  },
  {
    outlet: "Reuters",
    pieces: [
      { title: "Reuters — World", href: "https://www.reuters.com/world/" },
      { title: "Reuters — Health", href: "https://www.reuters.com/business/healthcare-pharmaceuticals/" },
      { title: "Reuters — Investigates", href: "https://www.reuters.com/investigates/" },
    ],
  },
  {
    outlet: "Russia Today",
    pieces: [
      { title: "RT — News", href: "https://www.rt.com/news/" },
      { title: "RT — World", href: "https://www.rt.com/news/world/" },
      { title: "RT — Op-ed", href: "https://www.rt.com/op-ed/" },
    ],
  },
  {
    outlet: "The Associated Press (AP)",
    pieces: [
      { title: "AP — World", href: "https://apnews.com/hub/world-news" },
      { title: "AP — Health", href: "https://apnews.com/hub/health" },
      { title: "AP — Politics", href: "https://apnews.com/hub/politics" },
    ],
  },
  {
    outlet: "The Guardian",
    pieces: [
      { title: "The Guardian — World", href: "https://www.theguardian.com/world" },
      { title: "The Guardian — Global development", href: "https://www.theguardian.com/global-development" },
      { title: "The Guardian — Society / health", href: "https://www.theguardian.com/society" },
    ],
  },
  {
    outlet: "The Lancet",
    pieces: [
      { title: "The Lancet — Home", href: "https://www.thelancet.com/" },
      { title: "The Lancet — Global health", href: "https://www.thelancet.com/journals/langlo/home" },
      { title: "The Lancet — Public health", href: "https://www.thelancet.com/journals/lanpub/home" },
    ],
  },
  {
    outlet: "The New York Times",
    pieces: [
      { title: "NYT — World", href: "https://www.nytimes.com/section/world" },
      { title: "NYT — Health", href: "https://www.nytimes.com/section/health" },
      { title: "NYT — Climate", href: "https://www.nytimes.com/section/climate" },
    ],
  },
  {
    outlet: "The Onion",
    pieces: [
      { title: "The Onion — News", href: "https://theonion.com/" },
      { title: "The Onion — Politics", href: "https://theonion.com/tag/politics/" },
      { title: "The Onion — Local", href: "https://theonion.com/tag/local/" },
    ],
  },
  {
    outlet: "The Straits Times",
    pieces: [
      { title: "Straits Times — World", href: "https://www.straitstimes.com/world" },
      { title: "Straits Times — Asia", href: "https://www.straitstimes.com/asia" },
      { title: "Straits Times — Opinion", href: "https://www.straitstimes.com/opinion" },
    ],
  },
  {
    outlet: "Wall Street Journal",
    pieces: [
      { title: "WSJ — World", href: "https://www.wsj.com/news/world" },
      { title: "WSJ — Health", href: "https://www.wsj.com/news/business/health" },
      { title: "WSJ — Politics", href: "https://www.wsj.com/news/politics" },
    ],
  },
  {
    outlet: "Wikileak",
    pieces: [
      { title: "WikiLeaks — Home", href: "https://wikileaks.org/" },
      { title: "WikiLeaks — Leaks", href: "https://wikileaks.org/-Leaks-.html" },
      { title: "WikiLeaks — News", href: "https://wikileaks.org/-News-.html" },
    ],
  },
  {
    outlet: "Xinhua News Agency",
    pieces: [
      { title: "Xinhua — English", href: "https://english.news.cn/" },
      { title: "Xinhua — World", href: "https://english.news.cn/world/" },
      { title: "Xinhua — Health", href: "https://english.news.cn/health/" },
    ],
  },
] as const;

function slugPiece(outlet: string, index: number): string {
  return `press-${outlet.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${index + 1}`;
}

export function pressCorpsOfficialLinks(): OfficialLinkDef[] {
  const links: OfficialLinkDef[] = [];
  for (const { outlet, pieces } of PRESS_CORPS_ALLOCATION_NEWS) {
    pieces.forEach((piece, index) => {
      links.push({
        linkKey: slugPiece(outlet, index),
        href: piece.href,
        title: piece.title,
        group: outlet,
      });
    });
  }
  return links;
}
