---
title: Deny has to mean deny
date: 2026-08-30
dek: Make the guard crash, time out, or sit on the wrong path, and a fail-open runtime runs the action anyway.
tags:
  - governance
  - agents
  - controls
sources:
  - https://commandline.microsoft.com/agent-hooks-framework-neutral-ai-governance-contract/
  - https://github.com/responsibleai/agent-hooks
frameworks:
  atlas:
    - AML.T0053
  attack:
    - T1562
  owaspLlm:
    - LLM06
  owaspAgentic:
    - ASI02
    - ASI08
---

Approval guards are only as strong as what happens when they fail. An attacker does not have to beat the guard. They have to make it throw.

A support agent could look up accounts and issue refunds. Refunds over a threshold needed approval. The approval guard threw on a malformed request. The dispatcher caught it, logged a warning, and executed the refund — its documented default. A batch path never fired the callback at all. Nothing bound either guard to what actually ran.

```mermaid
%% caption: Guard on the interactive path, missed on the batch path
flowchart LR
  subgraph interactive [Interactive]
    call1[Tool call] --> guard[Guard]
    guard --> refund1[Refund]
  end
  subgraph batch [Batch]
    call2[Tool call] --> refund2[Refund]
  end
```

That is the failure class: a control attached to one path, failing open, while the runtime grows paths. Callback systems make it worse. Observers cannot block, return values are discarded, exceptions are swallowed unless the author opts in, and filter order is not guaranteed, which decides whether redaction happens before egress.

Red team test: send malformed, oversized, and slow requests at every guard and watch whether the action still runs. Find the batch, retry, and resume paths and check each fires the same guard.

The control is a contract where a crash is a deny. Three verdicts — allow, deny, transform. An unresolved escalation is a deny. An unreachable interceptor or malformed verdict synthesizes deny. Approval binds to a hash of exactly what the approver saw, so replaying it against a mutated $8,400 refund fails. That is cooperative, not a sandbox, but on the paths it covers, deny stands.
