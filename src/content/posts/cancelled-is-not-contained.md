---
title: Cancelled is not contained
date: 2026-09-09
dek: An A2A cancellation request does not prove that delegated work has stopped or that its credentials can no longer act.
tags:
  - agents
  - governance
  - identity
  - response
sources:
  - https://a2a-protocol.org/latest/specification/#315-cancel-task
---

An analyst stops the parent agent. A delegated worker is still exporting files. The interface looks quiet because the task being watched is no longer the task doing the work.

A2A defines a cancellation operation, but its specification explicitly says success is not guaranteed. A task may already have completed, or cancellation may be unavailable at its current stage. The protocol gives applications a way to request a state change. The enterprise still needs to establish what that change means across queues, tools and downstream agents.

Consider a research agent that delegates document collection and then schedules an upload. Cancelling the research task can leave both a worker with a valid credential and a queued upload waiting to run. Stopping the conversation alone does not remove either capability.

A practical governance boundary needs an owner for the whole operation. That owner must be able to locate its descendants, block new delegation, invalidate execution authority and determine which side effects have already happened. A trace ID helps find related events, but a caller-supplied ID cannot authorise those controls.

The proposed design is a server-managed delegation record with an expiry and revocation state. Each receiving dispatcher checks that record before starting consequential work. Children receive no broader authority or later expiry than their approved parent allocation. A shared budget limits total work as well as depth: a shallow tree can still create thousands of siblings.

During an incident, mark the operation as stopping, refuse new work and request cancellation of known descendants. Revoke credentials where the downstream system supports it, or deny their use through a controlled gateway. Short-lived tokens bound the remaining exposure but do not disappear merely because the parent was cancelled.

Finally, reconcile the results. A completed external action may require a compensating action; it cannot be erased by relabelling the task. An unreachable worker is unconfirmed, not safely contained.

This builds on the [authorization receipt](/a2a-without-a-receipt/). The additional question is whether the organisation can withdraw authority after it has been delegated.

## Recommendations

- Assign an accountable owner and server-managed lineage to every delegated operation.
- Limit child count, total work, concurrency, depth and execution lifetime through trusted controls.
- Check revocation at receiving dispatchers and before delayed work resumes.
- Treat cancellation, credential revocation and confirmed cessation as separate incident states.
- Test workers that are disconnected, already running or holding a queued side effect.

Related pattern: [Revocable Delegation Boundary](/patterns/revocable-delegation-boundary/).
