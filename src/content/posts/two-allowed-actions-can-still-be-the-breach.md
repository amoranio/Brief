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

An agent can be allowed to read confidential files. It can also be allowed to send external email. Each permission is fine on its own. Together they can still leak the files. That is a confused-deputy problem.

Checking each tool call against a list of allowed tools is not enough. Each call can stay inside policy. The session can still be the attack. The missing control is a rule about pairs. If the session has already read a confidential file, it must not also send that file out. The paper names this composition closure. Prohibited pairs are checked against what the session has already done. That check runs outside the model.

```mermaid
%% caption: Two allowed tools combine into exfil; a gate that sees the pair can block it
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

Prompt injection matters here because the pair of tools can still run. If the infrastructure refuses the pair, the injection cannot finish the theft. The model can still be manipulated. The pair cannot run.

When one agent hands work to another, the second should not gain more power than the first. Blast radius should shrink along that chain. It should never grow. AWS has a Cedar sample for agents that hand work down a chain. It makes the same structural point. At each hop, permissions only narrow.

If your allowlist is a list of tools, you have described the parts. You have not described the session.
