---
title: Rendered-output exfiltration
date: 2026-10-08
dek: The model never sends anything. It writes a link or image, and the chat client makes the request for it.
tags:
  - exfiltration
  - prompt-injection
  - llm
sources:
  - https://atlas.mitre.org/techniques/AML.T0077
  - https://genai.owasp.org/llmrisk/llm052025-improper-output-handling/
  - https://arxiv.org/abs/2509.10540
frameworks:
  atlas:
    - AML.T0077
    - AML.T0057
    - AML.T0067
  attack:
    - T1567
  owaspLlm:
    - LLM05
    - LLM02
  owaspAgentic:
    - ASI01
---

Egress controls usually watch the agent's tools. This attack uses none. After an injection, the model outputs markdown or HTML that points at an attacker's server, with private data encoded into the URL.

The client renders it. An image tag fetches automatically, so the data leaves the moment the response is displayed. There is no tool call to deny, no outbound action to approve, and the user sees a broken image at most.

```mermaid
%% caption: The client, not the model, makes the request that carries data out
flowchart LR
  inject[Injected instruction] --> model[Model]
  model --> md[Markdown image with data in URL]
  md --> client[Chat client renders]
  client --> server[Attacker server]
```

It works because output is trusted as presentation. Rendering untrusted model text as active content crosses a boundary the design never named. Auto-fetched images, link previews, and embedded frames are all channels.

Red team test: from an indirect injection, ask the model to emit an image or link whose address includes a canary taken from the session. Watch your listener, not the chat window. Repeat for each surface that renders output — web, mobile, email, IDE.

The control is at the renderer. Do not fetch remote images from model output automatically, restrict rendering to an allowlist of origins with a content security policy, strip or rewrite links, and treat model output as untrusted before it reaches a browser.
