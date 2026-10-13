# Brief

A library of attacks on AI systems, mapped to MITRE ATLAS, MITRE ATT&CK, and OWASP.

Site: [brief.amoran.io](https://brief.amoran.io)

## Add an entry

1. Create a Markdown file in `src/content/posts/` (one attack per file).
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

`title`, `date`, `dek`, and `tags` are required. Tags are single words or kebab-case (`threat-model`). Each tag is listed at `/tags/{tag}/`. `sources` is an optional list of URLs, shown after the body.

When a post explains a control, include a Mermaid `flowchart` in the Markdown. Diagrams compile to inline SVG at build time. Add `%% caption: …` so the SVG has an accessible name.

`frameworks` is optional and each list may be omitted. IDs are validated at build time: ATLAS `AML.T####` (or `.###`), ATT&CK `T####` (or `.###`), OWASP LLM `LLM01`–`LLM10`, OWASP Agentic `ASI01`–`ASI10`. Every ID used must also have a name in `src/lib/frameworks.ts`, which supplies the display name and link. Verify new IDs against the official MITRE and OWASP pages.

Write each entry as: what the attacker does, why it works, a Mermaid diagram, how a red team tests it, and the control that breaks it. Technique level, no payloads.

Then `npm run build` to confirm the site builds. A push or merge to `main` publishes it.

## Search

`/search/` filters the library client-side from `/search.json`, built from every entry's title, dek, tags, framework IDs and names, and body. Queries are keywords or IDs (`exfil`, `mcp`, `AML.T0051`, `llm01`); every term must match. Press `/` to focus the box. `?q=` deep-links a query. `/frameworks/` lists the library by framework ID.

## Index and sitemap

The left index lists every post, every tag, About, and RSS. On a wide screen it sits in the margin and can be hidden. On a small screen it is a slide-over from an Index tab.

`/sitemap.xml` covers home, About, Search, Frameworks, entries, and tag pages.

## Commands

| Command | Action |
| --- | --- |
| `npm install` | Install dependencies |
| `npm run dev` | Local server at `localhost:4321` |
| `npm run build` | Write the static site to `./dist/` |

## Deploy

GitHub Actions builds the site with [withastro/action](https://github.com/withastro/action) and deploys to GitHub Pages on push to `main`.

In the repository: **Settings → Pages → Source → GitHub Actions**.
