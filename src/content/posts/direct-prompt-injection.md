---
title: Direct prompt injection
date: 2026-10-01
dek: The user is the attacker, and the model cannot tell their instructions from the developer's. Instructions are not a control.
tags:
  - prompt-injection
  - llm
sources:
  - https://arxiv.org/abs/2211.09527
  - https://genai.owasp.org/llmrisk/llm01-prompt-injection/
  - https://atlas.mitre.org/techniques/AML.T0051.000
frameworks:
  atlas:
    - AML.T0051
    - AML.T0051.000
    - AML.T0065
  owaspLlm:
    - LLM01
  owaspAgentic:
    - ASI01
---

The application puts its rules and the user's message into one context window. The model reads both as text. An attacker who is the user writes text that reads like a higher-priority rule.

That is the whole technique. There is no parser to confuse, because there is no boundary between instruction and data. The system prompt is a request, not an enforcement point. Anything the model is allowed to do, a determined user can ask it to do in a way the prompt did not anticipate.

```mermaid
%% caption: User text and developer rules share one context, so the model arbitrates
flowchart LR
  rules[Developer rules] --> ctx[Context window]
  user[Attacker as user] --> ctx
  ctx --> model[Model]
  model --> tools[Tools and data]
```

What makes it matter is not the model's reply. It is what sits behind the reply. A chatbot that only talks leaks embarrassment. An agent with tools, data, and credentials turns a successful injection into actions under the application's identity.

Red team test: probe what the model will do when told to ignore, reframe, or reorder its rules, using plain-language pressure rather than exotic payloads. Record which tool calls and data reads become reachable that the product intends to gate. Retest every release, because prompt tuning moves the result.

The control is not a better system prompt. Assume the injection succeeds and ask what it can reach. Enforce authorization on the tools, outside the model, with the user's own permissions, so the worst a hostile user obtains is what they could already do. Filters reduce noise. Architecture limits damage.
