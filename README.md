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

`title`, `date`, `dek`, and `tags` are required. Tags are single words or kebab-case (`threat-model`). Each tag is listed at `/tags/{tag}/`. `sources` is an optional list of URLs, shown after the body.

When a post explains a control, include a Mermaid `flowchart` in the Markdown. Diagrams compile to inline SVG at build time. Add `%% caption: …` so the SVG has an accessible name.

Then `npm run build` to confirm the site builds. A push or merge to `main` publishes it.

## Index and sitemap

The left index lists every post, every tag, About, and RSS. On a wide screen it sits in the margin and can be hidden. On a small screen it is a slide-over from an Index tab.

`/sitemap.xml` covers home, About, posts, and tag pages.

## Commands

| Command | Action |
| --- | --- |
| `npm install` | Install dependencies |
| `npm run dev` | Local server at `localhost:4321` |
| `npm run build` | Write the static site to `./dist/` |

## Deploy

GitHub Actions builds the site with [withastro/action](https://github.com/withastro/action) and deploys to GitHub Pages on push to `main`.

In the repository: **Settings → Pages → Source → GitHub Actions**.
