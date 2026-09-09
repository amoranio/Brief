---
title: A block rate is not a security outcome
date: 2026-09-09
dek: Measure whether a guardrail prevented the unwanted action, whether responders saw it, and whether the same control broke legitimate work.
tags:
  - guardrails
  - agents
  - controls
  - detection
sources:
  - https://genai.owasp.org/llmrisk/llm01-prompt-injection/
  - https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
---

A guardrail blocked a thousand prompts. The dashboard is busy. The security question remains: did it stop the action the organisation could not afford?

A block count has no useful denominator on its own. It can rise because attacks increased, because ordinary work was rejected, or because a noisy test kept submitting the same request. None of those tells you how often an attacker reached the target.

OWASP's prompt-injection guidance describes mitigations without claiming a foolproof prevention method. That is a reason to measure the deployed system, including its tool permissions and execution paths. A detector can recognise suspicious content while a separate route still performs the unwanted action. A detector can also miss an injection while an independent permission check prevents harm.

Take an assistant that summarises support cases and can export attachments. An evaluation should use a controlled destination and synthetic documents. Record whether the model proposed an unauthorised export, whether dispatch rejected it, whether any bytes arrived, and whether the incident reached the response queue. Those are separate results.

Include ordinary exports that should succeed. Otherwise a system that refuses everything can look excellent. Repeat cases across fresh runs and changed document wording; report attempts and observed outcomes instead of presenting one successful refusal as durable protection. Hold back some cases from tuning so the test does not simply reward familiarity.

Detection adds another clock. An alert after delivery may help contain the next action, but it did not prevent the first disclosure. Record the first suspicious event, alert arrival and confirmed containment. If the responder only receives a prompt fragment without an agent identity or tool request ID, the integration has not delivered an actionable incident.

OWASP's logging guidance emphasises application context that infrastructure logs often lack. For this use case, join the detector result to the policy decision, execution attempt and target outcome. Keep raw content restricted; the SOC usually needs attributable actions before it needs complete conversations.

This extends the [dispatch boundary](/the-guardrail-that-waved-traffic-through/) into an assurance question: can the team demonstrate both control effectiveness and an operational response?

## Recommendations

- Define the prohibited outcome and observe it independently at a controlled target.
- Report attack success and legitimate-task failure separately, with case counts and configuration versions.
- Cover document ingestion, tool results, retries and resumed work as well as the initial prompt.
- Measure alert delivery and confirmed containment, including actions completed before the response.
- Repeat the same acceptance tests after changes to models, guardrails, tools or permissions.

Related pattern: [Outcome-Based Guardrail Assurance](/patterns/outcome-based-guardrail-assurance/).
