# Diagram quality requirements

- Connector lines must never run through or over node boxes, headings, or labels. Connect only at the intended node boundary.
- Keep clear space between connectors and unrelated boxes and text. Do not hide bad routes behind opaque shapes.
- Apply these requirements to every post and architecture pattern.
- Run `npm test` and `npm run build` before publishing. Diagram validation is a required build gate; never bypass it to ship a diagram.
- Visually inspect the rendered SVGs, including labels and arrowheads, at desktop and mobile widths. If a diagram is crowded, simplify or split it before publishing.
- The renderer must fail when it cannot find a collision-free route or label position; never fall back to unchecked geometry.
