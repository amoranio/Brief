---
title: Two allowed actions can still be the breach
date: 2026-08-30
dek: Per-tool permission is not an architecture. The control is which combinations you will not allow in one session.
tags:
  - authorization
  - agents
  - tools
sources:
  - https://arxiv.org/abs/2608.15888
  - https://arxiv.org/html/2608.15888v1
  - https://github.com/aws-samples/sample-agentic-delegation
---

An agent allowed to read confidential files and send external email can combine them into exfiltration without violating either permission. That is confused deputy at the level of action composition.

Per-action authorization is structurally insufficient. Each tool call can be in policy while the session is the attack. The missing control is composition closure: prohibited combinations evaluated over session history, outside the model.

```mermaid
%% caption: Two allowed tools combining into exfil versus a composition gate that blocks the pair
flowchart LR
  subgraph open [Per-tool allow]
    read1[Read] --> exfil[Exfil]
    mail1[Email] --> exfil
  end
  subgraph closed [Composition gate]
    read2[Read] --> gate[Gate]
    mail2[Email] --> gate
    gate --> deny[Pair denied]
  end
```

Prompt injection's security consequence is largely this architecture problem. If the combination cannot execute at the infrastructure layer, the injection cannot complete the theft. The model can still be manipulated. The pair cannot run.

Blast radius should only shrink down a delegation chain, never expand. AWS's Cedar sample for agentic delegation makes the same structural point: at each hop, permissions only narrow.

If your allowlist is a list of tools, you have described the parts. You have not described the session.
