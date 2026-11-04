# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two audiences, equally weighted:

- Search visitors who typed "where to watch {title}" and land on a title page. They want the answer for their own country in seconds, then leave for the service.
- TheSubtitleDB (TSDB) users who press the play button on a TSDB title poster outside the US. The embed opens inside TSDB's dialog and shows the same answer in a compact frame; a click opens the full title page.

## Product Purpose

where2watch lists the legal places a film or TV series can be watched, country by country, with direct links submitted by the community. Success is a visitor finding a licensed option for their country and clicking through to it.

## Positioning

Availability data comes from JustWatch through the TMDB API, so it is the same breadth as the big guides. What a neighbour does not have: per-title community links to the exact page on a licensed service, kept in an open GitHub repository (one folder per title) and checked against an allowlist of licensed services, plus an embed that TSDB frames.

## Operating Context

- Static GitHub Pages site at https://where2watch.ch/ (custom domain; repo where2watchtv/where2watchtv.github.io), rebuilt daily.
- Addresses: `/movie/{tmdb}-{slug}/`, `/tv/{tmdb}-{slug}/`; IMDb ids resolve via `/tt...`, `?imdb=`, `?q=`.
- Embed `/embed/?tmdb=&type=` or `?imdb=`, optional `&country=`, shown in a TSDB dialog.
- Links are added through a GitHub issue form; a bot opens a pull request.

## Capabilities and Constraints

- Static HTML, no framework, no dependencies; pages must read fully without JavaScript (the visitor's country view is drawn on top by script).
- About 20,000 title pages; GitHub Pages 1 GB limit.
- Images come from TMDB's image CDN (posters, provider logos). No other image source.
- Must follow the visitor's light or dark system setting.
- Attribution required: JustWatch credit, and "This product uses the TMDB API but is not endorsed or certified by TMDB".
- Kinds of offer: Stream, Free, Free with ads, Rent, Buy.

## Brand Commitments

- Name on the page: where2watch.
- TSDB appears only as a subtitle provider on title pages ("Subtitle providers: TSDB"), not as a co-brand.
- Legal services only; never list or describe unlicensed sources.

## Evidence on Hand

Real data: TMDB titles, posters, overviews, provider names and logos per country. No testimonials, user counts or press exist; none may be invented.

## Product Principles

- The visitor's country first; the worldwide picture second.
- One click from the answer to the service.
- Open and checkable: every community link has a public history.
- Plain words, no marketing.
