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
---

Body in Markdown.
```

`title`, `date`, `dek`, and `tags` are required. Tags are single words or kebab-case (`threat-model`). Each tag is listed at `/tags/{tag}/` and includes matching patterns. `sources` is an optional list of URLs, shown after the body.

When a post explains a control, include a Mermaid `flowchart` in the Markdown. Diagrams compile to inline SVG at build time. Add `%% caption: …` so the SVG has an accessible name.

Then `npm run build` to confirm the site builds. A push or merge to `main` publishes it.

## Patterns

Patterns live in `src/content/patterns/` and are listed at `/patterns/`. They use the same tag vocabulary as posts. `tags` is optional until a pattern is classified; once tags exist, that pattern appears on `/tags/` and each `/tags/{tag}/` page beside the posts.

## Index, theme, and sitemap

The masthead is a single bar: **brief** on the left, **patterns / archive / tags / about** on the right, plus a theme toggle. There is no persistent index rail.

- Home is the post feed.
- `/archive/` lists every post and pattern.
- `/tags/` lists every tag used by posts or patterns.
- Theme follows `prefers-color-scheme` on first visit (dark system → black canvas). The toggle writes `brief-theme` to `localStorage` and then wins.

`/sitemap.xml` covers home, About, Archive, Tags, posts, patterns, and tag pages.

## Commands

| Command | Action |
| --- | --- |
| `npm install` | Install dependencies |
| `npm run dev` | Local server at `localhost:4321` |
| `npm run build` | Write the static site to `./dist/` |

## Deploy

GitHub Actions builds the site with [withastro/action](https://github.com/withastro/action) and deploys to GitHub Pages on push to `main`.

In the repository: **Settings → Pages → Source → GitHub Actions**.
