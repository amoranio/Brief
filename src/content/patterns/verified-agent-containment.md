---
title: Verified Agent Containment
date: 2026-09-05
dek: A control pattern for security architects and platform teams who run coding agents or MCP-backed tools on shared hosts. It replaces the comfort label “sandbox on” with an explicit, checkable isolation boundary so the agent cannot silently inherit the estate’s network paths and cloud identity.
relatedPost: sandbox-on-is-not-containment
sources:
  - https://docs.warp.dev/platform/self-hosting/security-and-networking/
  - https://www.aisi.gov.uk/blog/can-ai-agents-escape-their-sandboxes-a-benchmark-for-safely-measuring-container-breakout-capabilities
---

## Context and Problem

Operators often treat a sandbox toggle as containment. In practice the sandbox is often only a workspace and process shape. The agent still inherits the host’s VPN routes, internal APIs, cloud credentials, and sometimes a Docker socket or privileged container. Warp’s self-hosting guidance states that inheritance plainly for unmanaged runs. The UK AISI SandboxEscapeBench write-up (25 August 2026) shows frontier models can also escape common misconfigurations when prompted. The residual is not only “escape the box” — it is teams who believe they already contained the agent while it sits on the same paths an attacker would buy or phish for.

## Solution

Treat containment as an architecture you design and verify, not a product feature you switch on.

1. **Separate identity** — Give the agent its own principal. Do not mount or inject the host user’s cloud, VPN, or SSO credentials into the agent runtime.
2. **Deny estate reach by default** — No hostNetwork, no Docker socket, no privileged containers, no unsandboxed consumers of agent-written config. Egress is allowlisted to the tools the agent is meant to use.
3. **Prove the boundary** — Before production use, assert the negatives: no host network namespace, no socket mounts, no ambient cloud identity, no silent VPN inheritance. Re-check after image or orchestrator changes.
4. **Fail closed on the claim** — If verification fails, the agent does not start. “Sandbox on” is a claim under test, never a green light.

## Problems and considerations

- Self-hosted agent products often advertise host inheritance as a feature for power users. Product convenience and estate isolation pull in opposite directions; document which mode you are running.
- Over-tight egress can break legitimate tool use. Prefer narrow allowlists plus a change process over temporary “open everything” escapes that never get closed.
- A clean container with a mounted cloud CLI profile is still not contained. Identity inheritance is the usual silent failure.
- Escape benchmarks cover misconfiguration; they do not replace your own verification of your deploy path.

## When to use this pattern

Use this when agents or MCP tooling run on developer laptops, CI runners, or shared jump hosts that can already reach VPN, internal APIs, or cloud control planes — and when a stakeholder treats “sandbox on” as sufficient risk reduction. Skip it only for fully managed, vendor-isolated runtimes where you have already verified that host network and credential inheritance are impossible by design.
