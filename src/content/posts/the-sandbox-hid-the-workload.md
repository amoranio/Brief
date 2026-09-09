---
title: The sandbox hid the workload
date: 2026-09-09
dek: Stronger isolation can change what host sensors observe. Validate workload detection as part of the sandbox design.
tags:
  - agents
  - sandbox
  - detection
  - monitoring
sources:
  - https://gvisor.dev/docs/architecture_guide/security/
  - https://gvisor.dev/docs/user_guide/runtimemonitor/
---

The agent moves into a stronger sandbox. The host sensor stays healthy. Its old detections stop firing. That can be a visibility change rather than evidence that suspicious behaviour has disappeared.

The isolation mechanism matters. gVisor implements the application-facing system API in its Sentry instead of passing application system calls straight through to the host. That reduces exposure to the host kernel, but it also changes the observation point. A host-only rule that expects a particular guest process or syscall sequence may no longer receive the same events. Its coverage needs testing against the deployed runtime and sensor integration.

This does not mean gVisor workloads are unmonitorable. Its runtime-monitoring interface can stream application trace points to a separate process outside the sandbox. The documentation distinguishes that workload visibility from monitoring the health of gVisor itself. A healthy runtime and an observed workload answer different questions.

For an AI agent, the SOC needs more than a process event. It needs to connect the sandbox instance to the agent task, acting identity, tool request and destination. An unexpected connection becomes more useful when responders can identify which task authorised it and revoke that task's remaining authority.

Use a controlled test: ask a disposable workload to execute a harmless command, read a synthetic canary file and attempt a connection to a test destination that policy should block. Confirm which sensor sees each event, which policy blocks the connection and what reaches the SOC. If the action happened but the expected event is absent, record a coverage gap.

Run isolation tests alongside those visibility tests. An allowed network destination can still carry data out; a mounted secret is still readable within its permitted scope. More telemetry does not repair excessive access, and stronger isolation does not make a detector's assumptions correct.

The existing [containment pattern](/patterns/verified-agent-containment/) asks whether the workload can cross the boundary. This adds the operational question: can responders see and stop relevant behaviour while that boundary remains intact?

## Recommendations

- Map each detection to its actual observation point: host, guest runtime, gateway or application.
- Bind sandbox and process events to server-controlled task and workload identities.
- Validate file, process and network coverage with harmless, repeatable canaries.
- Keep collectors and evidence outside the workload's write authority, and alert on missing telemetry.
- Test containment and visibility again after runtime, sensor or isolation-policy changes.

Related pattern: [Sandbox Visibility Contract](/patterns/sandbox-visibility-contract/).
