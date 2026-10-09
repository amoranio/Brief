---
title: The LLM API reseller is the new bulletproof host
date: 2026-10-09
dek: The South Korea ARTEX campaign reached DeepSeek through xcai.pro, a proxy reseller. That one hop is why attribution and blocking both fail, and it is the supply-chain gap nobody is watching.
tags:
  - threat-intel
  - supply-chain
  - llm-security
  - attribution
  - red-team
sources:
  - https://www.crowdstrike.com/en-us/blog/unknown-threat-actor-uses-artex-to-target-south-korean-finance/
  - https://thehackernews.com/2026/10/artex-ai-pentesting-tool-used-in-data.html
  - https://cybersecuritynews.com/solo-hacker-used-ai-tools/
  - https://attack.mitre.org/techniques/T1588/007/
  - https://attack.mitre.org/techniques/T1090/
---

When CrowdStrike pulled apart the [South Korea financial campaign](https://www.crowdstrike.com/en-us/blog/unknown-threat-actor-uses-artex-to-target-south-korean-finance/) that ran from late September to early October 2026, the headline was the tooling: an open-source agentic pentesting framework called ARTEX, driving DeepSeek, GLM and Grok against multiple banks. But the detail that matters most for defenders is smaller and easier to miss. The operator did not call DeepSeek directly. They reached it through `xcai[.]pro`, a likely LLM API proxy and reseller.

That single hop is the story. It is why the campaign is unattributed, why blocking the model provider is pointless, and why the next ten campaigns will be harder to catch than this one.

## What a proxy reseller actually is

An LLM API reseller is a middleman. It buys model access in bulk from a provider, then resells it to customers who do not want, or cannot get, a direct account. The customer calls the reseller's endpoint; the reseller forwards the request to the upstream model and returns the completion. To the model provider, the traffic looks like it all comes from the reseller's account.

```text
Threat actor  →  xcai.pro endpoint  →  DeepSeek API  →  model
                (reseller account)     (upstream)
```

For a threat actor this is attractive for reasons that have nothing to do with cost. A reseller account is cheap, disposable, and does not require the identity checks a direct provider account might. The provider sees one reseller's key, not the operator behind it. And when the reseller is a small, lightly regulated shop, there is no obligation to know its customers.

## Why it breaks attribution

The ARTEX operator is assessed as likely Chinese-speaking and financially motivated, but not attributed to a named group. That is not a gap in CrowdStrike's analysis. It is a structural consequence of the reseller hop.

The forensic trail stops at the reseller. The model provider can tell you which reseller account made the calls, but not who sat behind it. The reseller may not keep logs, may not know its customer, or may be a front. The proxy IPs CrowdStrike recovered came from the operator's own sloppy open directories, not from the provider. Without that mistake, the operator would have been effectively invisible.

```text
Direct access:   provider logs  →  operator identity (attributable)
Reseller access: provider logs  →  reseller account  →  ??? (dead end)
```

This is the same reason attackers use bulletproof hosting and VPNs, applied to the model layer. The reseller is a layer of indirection that converts a technical trace into a dead end.

## Why it breaks blocking

A defender who sees `xcai.pro` in telemetry faces a choice with no good option. Block the reseller domain and you may break legitimate traffic, because resellers are shared infrastructure serving many customers. Block the upstream provider and you block nothing, because the operator just signs up with the next reseller. The provider cannot meaningfully block the operator either, because the provider only sees the reseller's key.

```text
Block xcai.pro   →  operator moves to the next reseller (shared infra, collateral damage)
Block DeepSeek   →  operator uses GLM, Grok, or the next model (nothing gained)
```

The reseller market is not a single point of failure. It is a commodity. There are dozens of shops doing the same thing, and the barrier to entry is a credit card and a forwarding script. Blocking one is a whack-a-mole game the defender cannot win.

## The supply-chain gap nobody is watching

This is the uncomfortable part. The model provider is a trusted third party in every AI supply chain, and the reseller sits between the provider and the customer. But most AI security programs treat the model API as a black box at the edge of the trust boundary. They do not ask who the reseller is, whether it is reputable, or whether its access is being resold onward.

The OWASP LLM Top 10 calls this out under LLM03, supply chain. A model accessed through an unvetted reseller is a supply-chain risk that is invisible to the application team, because the application just sees an OpenAI-compatible endpoint. The team does not know the traffic is being proxied through a third party that may be reselling access to anyone.

```python
# The application cannot tell the difference. Both look like a normal client.
import openai

# Direct:  openai.api_key = os.environ["OPENAI_KEY"]
# Reseller: openai.api_base = "https://xcai.pro/v1"   # same SDK, different host
```

The red-team lesson is that this is not a vulnerability to patch. It is an asymmetry to exploit. The attacker gets cheap, anonymous, disposable model access, and the defender has no telemetry that distinguishes a reseller call from a direct one.

## What defenders can actually do

The honest answer is that you cannot stop an operator from using a reseller. What you can do is stop treating the model API as a trusted black box, and build the same scrutiny you apply to any other third party:

- **Know your model endpoint.** If your application calls an OpenAI-compatible API, verify the base URL is the provider you think it is. A surprising number of integrations point at a reseller or a mirror without anyone noticing.
- **Ask your provider about resale.** If you buy model access through a reseller, understand their customer vetting and whether your key can be resold onward. Treat a reseller that cannot answer as a risk.
- **Watch for anomalous model traffic.** A sudden burst of calls from a single key, or calls that do not match your application's behavior, may be a resold key being used by someone else.
- **Do not rely on attribution.** Build detections on behavior and infrastructure, not on who you think the operator is. The reseller hop means the "who" may be permanently unknowable.

## Recommendations

- Verify the base URL of every model API integration; a reseller or mirror endpoint is indistinguishable from the real provider at the SDK level.
- Treat model access bought through a reseller as a supply-chain risk under OWASP LLM03, and require the reseller to demonstrate customer vetting and no onward resale of your key.
- Monitor model API usage for anomalous patterns, since a resold key can be used by someone other than your application.
- Build detections on behavior and infrastructure rather than attribution, because the reseller hop can make the operator permanently unidentifiable.
- Assume any model access you do not control is being proxied, and scope the blast radius of a single leaked key accordingly.

*Campaign details from the linked CrowdStrike analysis; MITRE mappings for T1588/007 (Obtain Capabilities: Artificial Intelligence) and T1090 (Proxy).*