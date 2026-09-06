---
title: Verified Dispatch Path
date: 2026-09-06
dek: A control pattern for security architects and platform teams who run agent harnesses with model-layer guardrails. It treats a green dashboard as worthless unless tool dispatch requires a verified model turn — so forged history and co-opted judges cannot wave traffic through.
tags:
  - guardrails
  - agents
  - harness
  - threat-model
relatedPost: the-guardrail-that-waved-traffic-through
sources:
  - https://www.hiddenlayer.com/research/same-model-different-hat
  - https://labs.cloudsecurityalliance.org/research/csa-research-note-agent-infra-guardrail-bypass-20260806-csa/
---

## Context and Problem

Teams often put jailbreak and prompt-injection detectors on the model turn and read “allowed” as containment. Two failure modes break that assumption. HiddenLayer’s “Same Model, Different Hat” (10 October 2025) shows LLM-as-judge detectors that share a model class with the base model: one injection can keep the judge under threshold while the answer still ships. CSA’s CoreBreak note (6 August 2026), shown as Stealth at Black Hat USA 2026, shows the skip: a forged tool call or forged human confirm in message history reaches Bedrock AgentCore, Google ADK, and Vercel AI SDK harnesses without the model ever running. Every model-layer guardrail never gets a vote. The residual is treating filters as containment while dispatch still trusts authored history.

## Solution

Put enforcement on a path that cannot be skipped or co-opted by the same failure mode it claims to stop.

1. **Require a verified model turn before dispatch** — Tool runs need a matching completion from the model turn you trust, not only a line in chat history.
2. **Bind tool arguments to that turn** — Arguments must hash or otherwise bind to the verified completion; replayed or edited payloads fail closed.
3. **Reject forged human confirms** — HITL or confirm events must match the recorded call identity; unsigned or mismatched confirms never open dispatch.
4. **Alert on orphan tool runs** — Tool execution with no matching verified completion is an incident signal, not a quiet success.
5. **Separate the judge** — Any LLM judge uses a different model class than the model it scores, so one injection cannot silence both.

## Problems and considerations

- Strict turn-binding can break legitimate multi-step tools that resume mid-flow. Design explicit resume tokens rather than trusting free-form history.
- A second model class for judging costs latency and money; it still does not fix CoreBreak-class skips if dispatch never consults either model.
- Dashboard “allowed” remains a comfort label until you can prove which path the call took.
- Harness vendors differ on where history is trusted; verify your SDK’s dispatch gate, not the product brochure.

## When to use this pattern

Use this when agent tools can run from harness message history, when guardrails are LLM judges on the model path, or when stakeholders treat a green guardrail dashboard as proof the tool could not have fired unsafely. Skip it only for systems where every tool invocation is cryptographically bound to a verified model completion by design and forged history cannot reach the dispatcher.
