---
title: Skill Grant on the Hop
date: 2026-09-07
dek: Enforce skill-level policy at the receiving agent, then bind a durable authorization receipt to the call before it runs.
tags:
  - agents
  - governance
  - threat-model
  - identity
relatedPost: a2a-without-a-receipt
sources:
  - https://a2a-protocol.org/v1.0.0/specification/
  - https://docs.cloud.google.com/iam/docs/agent-identity-overview
  - https://zitadel.com/blog/ai-agent-impersonation
  - https://github.com/mitre-atlas/atlas-data/blob/main/data/techniques.yaml
---

## Context and Problem

An agent hop produces three facts that teams often collapse into one. Attested identity establishes who connected. Authorization determines what that principal may do. Audit evidence shows which policy decision governed this call.

A2A 1.0 supports agent- and skill-level security requirements and requires the receiving server to authorize every protocol-operation request. That is the right boundary, but the policy remains agent-defined. An Agent Card therefore shows what the server declares; it does not prove that a particular request passed the declared check.

Google Cloud Agent Identity can strengthen the first fact with a per-agent SPIFFE ID and managed X.509 credentials. IAM can supply the second. For investigations into AI Agent Tool Invocation (AML.T0053), teams still need the third: a durable decision record connecting the authenticated actor, represented user, requested skill, and policy outcome to the exact call that ran.

## Solution

Require a valid, server-issued allow receipt before skill dispatch. Record deny decisions too, but never treat a receipt's existence as authority to run.

1. **Attest the caller** — Prefer a unique workload identity, such as SPIFFE, over a shared service account. Preserve both the acting agent and represented user when delegation is involved.
2. **Evaluate at the receiving boundary** — Resolve the requested skill, action, and resource, then run server-side policy. Agent Card security requirements inform the check; they do not replace it.
3. **Emit the receipt** — For every allow or deny, record the decision ID, outcome, actor, represented user, skill, action, resource, task or context ID, policy version, decision time, and request digest. Give allow decisions an expiry. Reference credential IDs or hashes rather than storing secrets.
4. **Bind allow to dispatch** — Pass the decision ID through an internal, non-user-controlled channel. The dispatcher verifies that the receipt is an unexpired allow for the exact request. If the record cannot be written, found, or matched, the skill does not run.
5. **Preserve the chain** — Store receipts in immutable or tamper-evident logs. Carry correlation IDs through retries, callbacks, and downstream hops. Each receiving agent makes and records its own decision; an upstream allow is never downstream authority.

## Problems and considerations

- Decision logging adds latency and storage volume. Batch durable writes only if dispatch waits for confirmation that its receipt is durable.
- Cached policy outcomes need short lifetimes and exact request binding; an old allow must not become ambient authority.
- Asynchronous tasks, retries, and resumptions need new decisions whenever the action, resource, identity, or policy version changes.
- Receipts contain security and identity metadata. Apply retention limits, access controls, and redaction without removing the fields responders need.
- A receipt proves that a policy decision occurred. It does not prove that the policy was correct or that the authenticated identity was uncompromised.

## When to use this pattern

Use this for cross-agent calls where skills can change data, spend money, expose sensitive information, or trigger downstream tools. It is also useful wherever incident response, compliance, or auditability requires more than an authenticated principal and a success log.

Do not add a second receipt system if the policy decision point already emits durable, tamper-evident records containing these fields and the dispatcher cryptographically or transactionally binds each allow to the exact call.
