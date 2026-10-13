# Brief

A short publication on AI security architecture and risk.

Site: [brief.amoran.io](https://brief.amoran.io)

## Add a post

1. Create a Markdown file in `src/content/posts/`.
2. The filename is the URL. `example.md` is published at `/example/`.
3. Use this frontmatter:

```md
---
title: The title
date: 2026-09-01
dek: One-line standfirst.
tags:
  - agents
  - authorization
sources:
  - https://example.com/source
frameworks:
  atlas:
    - AML.T0051
  attack:
    - T1567
  owaspLlm:
    - LLM01
  owaspAgentic:
    - ASI01
---

Body in Markdown.
```

`title`, `date`, `dek`, and `tags` are required. Tags are single words or kebab-case (`threat-model`). Each tag is listed at `/tags/{tag}/` and includes matching patterns. `sources` is an optional list of URLs, shown after the body.

When a post explains a control, include a Mermaid `flowchart` in the Markdown. Diagrams compile to inline SVG at build time. Add `%% caption: …` so the SVG has an accessible name.

`frameworks` is optional and each list may be omitted. IDs are validated at build time: ATLAS `AML.T####` (or `.###`), ATT&CK `T####` (or `.###`), OWASP LLM `LLM01`–`LLM10`, OWASP Agentic `ASI01`–`ASI10`. Every ID used must also be named in `src/lib/frameworks.ts`, which supplies the display name and link. Verify new IDs against the official MITRE and OWASP pages.

Then `npm run build` to confirm the site builds. A push or merge to `main` publishes it.

## Search and frameworks

`/search/` filters posts and patterns client-side from `/search.json` (title, dek, tags, framework IDs and names, body). Queries are keywords or IDs (`exfil`, `mcp`, `AML.T0051`, `llm01`); every term must match. `?q=` deep-links a query; `/` focuses the box. `/frameworks/` lists entries by framework ID. Posts not yet mapped still appear in search.

## Patterns

Patterns live in `src/content/patterns/` and are listed at `/patterns/`. They use the same tag vocabulary as posts. `tags` is optional until a pattern is classified; once tags exist, that pattern appears on `/tags/` and each `/tags/{tag}/` page beside the posts.

## Index, theme, and sitemap

The masthead is a single bar: the locked **— Brief.** wordmark on the left, navigation on the right, a theme toggle, and a magnifying-glass search at the far right. The glass expands into a field; Enter, or the glass again, opens `/search/?q=…`. `/` also opens it. The navigation collapses to a menu on smaller screens. There is no persistent index rail.

- Home is the post feed.
- `/archive/` lists every post and pattern, but is hidden: no navigation link, no sitemap entry, `noindex`.
- `/tags/` lists every tag used by posts or patterns.
- Theme follows `prefers-color-scheme` on first visit (dark system → black canvas). The toggle writes `brief-theme` to `localStorage` and then wins.

`/sitemap.xml` covers home, Search, Frameworks, Patterns, Tags, posts, pattern pages, and tag pages. `/archive/` is unlisted: it is not linked, not in the sitemap, and is marked `noindex`.

## Commands

| Command | Action |
| --- | --- |
| `npm install` | Install dependencies |
| `npm run dev` | Local server at `localhost:4321` |
| `npm run build` | Write the static site to `./dist/` |

## Deploy

GitHub Actions builds the site with [withastro/action](https://github.com/withastro/action) and deploys to GitHub Pages on push to `main`.

In the repository: **Settings → Pages → Source → GitHub Actions**.
