---
title: MCP access is now an IdP problem
date: 2026-08-29
dek: Enterprise-managed auth moves the privilege decision off the consent screen and onto identity policy. The blast radius moves with that decision.
tags:
  - identity
  - mcp
  - authorization
sources:
  - https://blog.modelcontextprotocol.io/posts/enterprise-managed-auth/
  - https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/extensions/auth/enterprise-managed-authorization.mdx
  - https://support.claude.com/en/articles/15537633-authorize-mcp-connectors-for-your-entire-organization
  - https://claude.com/docs/connectors/building/enterprise-managed-auth
---

The MCP Enterprise-Managed Authorization extension is now stable. Anthropic, Microsoft, Okta, and a first wave of servers have adopted it. That is an architecture change, not a convenience feature.

Until recently, most MCP access was a per-user, per-server OAuth consent. The privilege decision sat with the person in the chat. EMA moves that decision: the enterprise identity provider is the decision-maker. The client obtains an Identity Assertion JWT Authorization Grant (ID-JAG) from the IdP and exchanges it for an access token at the MCP server's authorization server. There is no per-server consent screen.

```mermaid
%% caption: The privilege decision sits at the IdP, not on a consent screen
flowchart LR
  client[MCP client] --> idp[IdP policy]
  idp --> jag[ID-JAG]
  jag --> server[MCP server]
```

Three properties follow from that flow. Admins authorize a server once, and users inherit access through existing groups and roles. Revocation happens once at the IdP and applies everywhere. Removing the account picker makes it harder to spill data between a personal account and an enterprise one.

The risk moves with that control. You are no longer reviewing a popup. You are reviewing an IdP allowlist, group mappings, and whether the MCP server's authorization server actually validates issuer, audience, expiry, subject, and tenant. A single over-broad IdP policy is now the blast radius.

Anthropic's own note is the one to keep: Claude relays what the IdP issued. Scope and data access are still the identity provider's policy and the connected service's permissions, not Anthropic's.

If your MCP estate is still "everyone clicks Allow", you do not have a connector problem. You have an identity boundary you have not designed.
