---
title: A2A without a receipt
date: 2026-09-07
dek: An authenticated A2A hop is not a receipt of authority.
tags:
  - agents
  - governance
  - threat-model
  - identity
sources:
  - https://docs.cloud.google.com/iam/docs/agent-identity-overview
  - https://zitadel.com/blog/ai-agent-impersonation
  - https://dev.to/kanywst/a2a-protocol-auth-taken-apart-why-the-spec-is-thin-and-where-that-leaves-holes-22ii
---

The hop authenticated. Nobody can say who authorized the skill.

SPIFFE can prove which agent spoke. Google Cloud Agent Identity assigns each agent a strongly attested SPIFFE ID and short-lived X.509 credentials, then maps that principal into IAM. That is real identity on the wire. It is not a recorded grant that this caller may invoke that skill under that principal on this hop.

A2A makes the gap structural. The protocol tells agents how to advertise credentials in an Agent Card. It does not define an authorization framework for which peer may call which skill. ZITADEL’s agent-to-agent write-up states the split plainly: authenticate the agent, then separately authorize the specific skill. Skip the second check and you have a signed conversation with no recorded grant.

MITRE ATLAS maps the hop as AML.T0053 (AI Agent Tool Invocation): an authenticated peer invokes a skill across the A2A boundary. For IR, SPIFFE answers who spoke. Without a skill-scoped grant record on that hop, you still cannot answer who authorized that skill, for which principal, at that moment. The decision chain breaks in the timeline.

```mermaid
%% caption: Top path is identity only then skill; bottom path records a skill grant on the hop first
flowchart TD
  a1[Caller] --> h1[A2A hop]
  h1 --> i1[SPIFFE who]
  i1 --> s1[Skill runs]
  a2[Caller] --> h2[A2A hop]
  h2 --> i2[SPIFFE who]
  i2 --> g2[Skill grant recorded]
  g2 --> s2[Skill runs]
```

Identity without a receipt is a signed shrug.

## Recommendations

- Require a skill-scoped grant record on every A2A hop before the skill runs.
- Treat SPIFFE or Agent Card auth as identity proof, not authorization.
- Log who decided, which skill, which principal, and which hop together.
- Deny skill calls that arrive with identity alone and no grant artifact.
- Prefer per-agent attested identity (SPIFFE-class) over shared service accounts for the identity half of the check.
