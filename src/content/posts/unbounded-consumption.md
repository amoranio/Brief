---
title: Unbounded consumption
date: 2026-10-12
dek: Inference costs money per token. An attacker who can make the system think for longer can run up the bill or take it down.
tags:
  - availability
  - cost
  - agents
sources:
  - https://genai.owasp.org/llmrisk/llm102025-unbounded-consumption/
  - https://atlas.mitre.org/techniques/AML.T0034
  - https://atlas.mitre.org/techniques/AML.T0029
frameworks:
  atlas:
    - AML.T0034
    - AML.T0034.002
    - AML.T0029
  attack:
    - T1496
  owaspLlm:
    - LLM10
  owaspAgentic:
    - ASI02
    - ASI08
---

Classic denial of service floods a network. Against AI systems the cheaper lever is work per request. Long prompts, inputs that provoke long outputs, and tasks that trigger many tool calls all cost far more than a normal query.

Agents make it worse. A loop that retries, fans out to sub-agents, or keeps calling a failing tool can spend without bound from one trigger. Planted content can start the loop: an indirect injection that tells the agent to keep going. The result is denial of wallet, or an outage once quotas run out.

```mermaid
%% caption: One cheap trigger fans out into unbounded spend
flowchart LR
  attacker[Cheap request] --> agent[Agent loop]
  agent --> calls[Many model calls]
  agent --> tools[Many tool calls]
  calls --> bill[Cost climbs]
  tools --> quota[Quota exhausted]
```

It also hurts others. A shared quota or rate limit consumed by one tenant degrades every tenant, and expensive requests crowd out normal ones.

Red team test: measure cost and latency per request, then find the cheapest input that maximises both: long context, recursive instructions, tool loops. Check what ends a runaway session and how fast anyone would notice.

The control is budgets everywhere. Cap input and output size, steps, tool calls, depth, and wall time per request and per identity. Rate limit per user and tenant, set spend alerts and hard stops, and make loop detection a first-class failure.
