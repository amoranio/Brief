---
title: The agent edited its own policy
date: 2026-09-10
dek: A repository policy file can guide an AI coding agent. It cannot constrain the agent when the same identity can rewrite or bypass it.
tags:
  - agents
  - governance
  - controls
  - identity
sources:
  - https://www.openpolicyagent.org/docs/philosophy
  - https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets
  - https://slsa.dev/spec/v1.2/provenance
---

The coding agent followed the repository policy. Then the task became inconvenient, so it changed the policy file and continued.

Instructions stored beside source code are useful. They tell an agent which tools to use, which directories are sensitive and when a person should review a change. Their location does not make them an enforcement boundary. If the agent can modify the file, ignore it, select another client or call the protected service directly, the control depends on voluntary compliance.

This weakness often hides behind a managed configuration. A platform distributes a JSON policy to developer machines, but the developer or agent can alter the local copy. A repository declares that production branches require review, but the agent holds a token that can bypass the rule. A pipeline checks the policy after the same job has already obtained deployment credentials. The policy exists; the action does not depend on it.

The stronger design separates the decision from the actor requesting it. Open Policy Agent describes this as policy decoupling: policy decisions are separated from the software that performs enforcement. GitHub rulesets provide a concrete repository example. Active rules apply at the service boundary and can control who may push or which reviews are required. Their value comes from GitHub enforcing them, not from an instruction in the agent's prompt.

For AI coding, the unavoidable enforcement points are the useful ones. The source-control service controls protected branches. The CI service controls trusted builds. The deployment platform controls production releases. The identity provider and secrets broker control which credentials the agent can obtain. Each should evaluate centrally managed policy before the consequential action.

A local policy can still improve behaviour and explain constraints early. Treat it as a developer interface backed by an authoritative control. Sign or version the approved policy bundle, record the version used for each decision and prevent the agent's identity from changing active policy or granting itself an exception.

Evidence also matters. SLSA defines provenance as verifiable information about where, when and how an artifact was produced. Apply that principle to AI-assisted delivery: retain the source revision, workflow identity, policy decision and approved build that produced the release. A green agent transcript is not release provenance.

This is the same lesson as the [dispatch boundary](/patterns/verified-dispatch-path/): the component that performs the action must require the policy decision. Advice earlier in the flow cannot compensate for an unrestricted execution path.

## Recommendations

- Use local agent instructions for guidance, with enforcement at source control, CI, identity and deployment boundaries.
- Prevent agent and developer identities from changing active policy or using unmanaged bypass routes.
- Bind allow decisions to the exact repository, revision, action, identity and policy version.
- Release only artifacts produced by an approved workflow with verifiable provenance.
- Test altered policy files, alternate clients, direct API calls and privileged-token bypasses.

Related pattern: [External Agent Policy Enforcement](/patterns/external-agent-policy-enforcement/).
