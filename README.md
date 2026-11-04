# where2watch

A static site that lists where a film or TV series can be watched legally, country by country. Availability comes from JustWatch through the TMDB API. Anyone can add a direct link to a licensed service through a GitHub issue.

## Addresses

| Address | Shows |
|---|---|
| `/movie/603-the-matrix/` | A title page. TMDB type and id are the canonical address. |
| `/?imdb=tt0133093`, `/tt0133093` | Redirects to the title page. |
| `/?tmdb=603&type=movie`, `/movie/603` | Redirects to the title page. |
| `/?q=tt0133093` | The search box. Takes either kind of id. |
| `/embed/?imdb=tt0133093` | The embed. Also `?tmdb=603&type=movie` and `&country=GB`. |

The embed lists the services for the visitor's country and the community links. Each item opens the title page in a new tab.

## Build

```bash
TMDB_API_KEY=... node src/build.mjs --limit 200
```

Writes `dist/`. Titles are the most popular titles TSDB has pages for, up to `titleLimit` in `site.config.json`, plus every title with a folder under `titles/`. The build fails if more than 1% of TMDB lookups fail. TMDB responses are cached in `.cache/` for 20 hours.

`npm test` runs the tests. `npm run check` checks every links file.

## Deploy

`.github/workflows/pages.yml` builds and deploys to GitHub Pages on every push to main and daily at 04:20 UTC. It needs the `TMDB_API_KEY` repository secret.

## Community links

Links live in `titles/{movie|tv}/{tmdb id}-{slug}/links.json`. See [CONTRIBUTING.md](CONTRIBUTING.md).

This product uses the TMDB API but is not endorsed or certified by TMDB.
