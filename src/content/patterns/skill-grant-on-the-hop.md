---
title: Skill Grant on the Hop
date: 2026-09-07
dek: A control pattern for security architects and platform teams who connect agents over A2A (or similar peer protocols). It separates attested identity from authorization: SPIFFE-class proof shows who spoke; a skill-scoped grant record on that hop is the receipt of who decided what may run.
tags:
  - agents
  - governance
  - threat-model
  - identity
relatedPost: a2a-without-a-receipt
sources:
  - https://docs.cloud.google.com/iam/docs/agent-identity-overview
  - https://zitadel.com/blog/ai-agent-impersonation
  - https://dev.to/kanywst/a2a-protocol-auth-taken-apart-why-the-spec-is-thin-and-where-that-leaves-holes-22ii
---

## Context and Problem

Authenticated agent hops are easy to read as authorization. Google Cloud Agent Identity gives each agent a strongly attested SPIFFE ID and short-lived X.509 credentials mapped into IAM — real identity on the wire. A2A’s Agent Card advertises credentials but does not define which peer may call which skill. ZITADEL’s agent-to-agent guidance splits the check: authenticate the agent, then separately authorize the specific skill. Skip the second step and you have a signed conversation with no recorded grant. MITRE ATLAS maps the hop as AML.T0053 (AI Agent Tool Invocation). For IR, SPIFFE answers who spoke; without a skill-scoped grant on that hop, you still cannot answer who authorized that skill, for which principal, at that moment. The residual is treating identity as a receipt of authority.

## Solution

Require a skill-scoped grant artifact on every hop before the skill runs — identity alone never opens the skill.

1. **Attest who spoke** — Prefer per-agent SPIFFE-class identity over shared service accounts for the identity half of the check.
2. **Record the grant on the hop** — Before skill execution, persist who decided, which skill, which principal, and which hop together as one artifact.
3. **Authorize the skill separately** — Treat Agent Card or SPIFFE auth as identity proof only; run an explicit skill authorization check against the grant.
4. **Fail closed without a receipt** — Deny skill calls that arrive with identity alone and no grant artifact.
5. **Keep the IR timeline reconstructable** — Logs must join identity, grant, skill, and hop so responders can rebuild the decision chain.

## Problems and considerations

- Grant stores and policy engines add latency; cache carefully without turning a stale grant into ambient authority.
- Shared service accounts collapse the “who spoke” half of the pattern even if grants look fine on paper.
- Protocol gaps (A2A has no built-in authz framework) mean you own the grant layer in the harness or gateway — do not wait for the Agent Card to grow one.
- Impersonation (AML.T0073) is a different failure: forged identity. Here the identity may be real and the receipt is still missing; do not conflate the two in IR playbooks.

## When to use this pattern

Use this when agents invoke skills across an A2A (or peer) boundary, when SPIFFE or Agent Card auth is present, and when IR or governance needs a decision chain beyond “the hop authenticated.” Skip it only for single-agent tool use with no peer hop, or for systems that already bind every skill call to a skill-scoped grant artifact by design.
