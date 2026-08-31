---
title: MCP access is now an IdP problem
date: 2026-08-29
dek: The privilege decision leaves the consent screen and sits in identity policy. The blast radius sits there too.
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

The MCP Enterprise-Managed Authorization extension is now stable, and Anthropic, Microsoft, Okta, and a first wave of servers have already adopted it. That is an architecture change, not a convenience feature.

Until recently, most MCP access was OAuth consent: each user approved each server, so the person in the chat decided what the connector could reach. Enterprise-managed auth (EMA) takes that decision away from the popup and gives it to the enterprise identity provider.

During single sign-on, the client asks the IdP for an Identity Assertion JWT Authorization Grant. Call that the grant. The MCP server has its own authorization server, and the client trades the grant there for an access token, so there is no per-server consent screen.

```mermaid
%% caption: The privilege decision sits at the IdP, not on a consent screen
flowchart LR
  client[MCP client] --> idp[IdP policy]
  idp --> jag[Grant]
  jag --> server[MCP server]
```

Three things follow from that flow. An admin authorizes a server once, users inherit that access through the groups and roles they already have, and revocation happens once at the IdP and applies everywhere. Removing the account picker also makes it harder to mix a personal account with an enterprise one.

The decision has moved, and so has the risk. You are no longer reviewing a popup; you are reviewing an IdP allowlist and the group mappings behind it. You also need to know whether the MCP server’s authorization server actually validates the token (issuer, audience, expiry, subject, and tenant all have to be checked), because one over-broad IdP policy is now the blast radius.

Anthropic’s own note is the one to keep: Claude relays what the IdP issued. Scope still comes from the identity provider’s policy, and data access still comes from the connected service’s permissions. Neither comes from Anthropic.

If your MCP estate is still “everyone clicks Allow”, you do not have a connector problem. You have an identity boundary you have not designed.
