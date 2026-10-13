---
title: Malicious skill and plugin supply chain
date: 2026-10-10
dek: Skills, plugins, and extensions are code and instructions installed by one click. The attacker publishes a helpful one.
tags:
  - supply-chain
  - agents
  - tools
sources:
  - https://atlas.mitre.org/techniques/AML.T0104
  - https://genai.owasp.org/llmrisk/llm032025-supply-chain/
  - https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/
frameworks:
  atlas:
    - AML.T0104
    - AML.T0010
    - AML.T0011
    - AML.T0011.002
  attack:
    - T1195
    - T1195.002
    - T1204
  owaspLlm:
    - LLM03
  owaspAgentic:
    - ASI04
---

Agent ecosystems grow through shared packages: skills, plugins, MCP servers, prompt templates. Each one adds code the agent runs and text the model obeys. A public registry is a distribution channel for whoever publishes first.

The attacker ships something genuinely useful with a second purpose. It might read credentials during setup, rewrite the agent's configuration, or carry instructions that steer the model whenever it loads. Names near popular ones, inflated install counts, and a clean first version do the rest.

```mermaid
%% caption: A published package gains the agent's privileges on install
flowchart LR
  attacker[Attacker] --> pkg[Helpful package]
  pkg --> registry[Public registry]
  registry --> install[User installs]
  install --> agent[Agent with credentials]
  agent --> abuse[Package acts with agent privileges]
```

Two layers need review, and teams usually check only one. The code can be audited like any dependency. The instructions in a skill or description are also executable, because the model will do what they say.

Red team test: build an inert package that logs where it runs and what it can read, publish it to an internal registry, and see who installs it and what review it gets. Check what a freshly installed extension can access with no further prompt.

The control is ordinary supply chain hygiene aimed at a new target. Allowlist sources, pin and sign versions, review instructions as well as code, run extensions with minimal permissions, and keep an inventory of what is installed where.
