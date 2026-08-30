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
sources:
  - https://example.com/source
---

Body in Markdown.
```

`title`, `date`, and `dek` are required. `sources` is an optional list of URLs, shown after the body.

Then `npm run build` to confirm the site builds. A push or merge to `main` publishes it.

## Commands

| Command | Action |
| --- | --- |
| `npm install` | Install dependencies |
| `npm run dev` | Local server at `localhost:4321` |
| `npm run build` | Write the static site to `./dist/` |

## Deploy

GitHub Actions builds the site with [withastro/action](https://github.com/withastro/action) and deploys to GitHub Pages on push to `main`.

In the repository: **Settings → Pages → Source → GitHub Actions**.
