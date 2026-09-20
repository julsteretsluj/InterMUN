// Copyright (c) 2026 Intermun. All rights reserved.
// Licensed under the Apache License, Version 2.0 (see LICENSE).

"use client";

import Script from "next/script";

const MAZE_INIT = `(function (m, a, z, e) {
  var s, t, u, v;
  try {
    t = m.sessionStorage.getItem("maze-us");
  } catch (err) {}

  if (!t) {
    t = new Date().getTime();
    try {
      m.sessionStorage.setItem("maze-us", t);
    } catch (err) {}
  }

  u = document.currentScript || (function () {
    var w = document.getElementsByTagName("script");
    return w[w.length - 1];
  })();
  v = u && u.nonce;

  s = a.createElement("script");
  s.src = z + "?apiKey=" + e;
  s.async = true;
  if (v) s.setAttribute("nonce", v);
  a.getElementsByTagName("head")[0].appendChild(s);
  m.mazeUniversalSnippetApiKey = e;
})(window, document, "https://snippet.maze.co/maze-universal-loader.js", "0fe5ce1b-25bb-4e97-8a3a-9bf0a1c1405e");`;

/** Maze analytics — marketing surfaces only (not dashboard chrome). */
export function MarketingMazeScript() {
  return (
    <Script id="maze-universal-loader" strategy="lazyOnload">
      {MAZE_INIT}
    </Script>
  );
}
