---
name: frontend-handoff
description: 'Create a frontend handoff Markdown file in Polish for backend or API changes. Use when preparing implementation notes for a Next.js/React frontend that uses TanStack Query, Zustand, and generated API types. Always save the handoff under docs/handoffs and include created/changed types, a types diff section, endpoints, request and response examples, edge cases, auth or state implications, and clear frontend action items.'
argument-hint: 'feature, grupa endpointów lub zmiana backendowa do przekazania frontowi'
---

# Frontend Handoff

Utwórz dokument handoff jako plik `.md` dla zespołu frontendowego.

Ten skill służy do komunikacji backend → frontend w tym projekcie, gdzie frontend korzysta z:

- Vite
- React
- TanStack Query
- Zustand
- automatically generated types based on API contracts

## When to Use

Użyj tego skilla, gdy:

- an endpoint was added, changed, deprecated, or removed
- request or response payloads changed
- generated frontend types will change because of API contract changes
- auth, pagination, filtering, validation, or error semantics changed
- a backend fix introduces frontend-visible edge cases or migration work
- you need to produce a reusable handoff file instead of a chat-only summary

Nie używaj tego skilla do ogólnego changelogu ani release notes. Wynik ma być praktycznym handoffem wdrożeniowym dla frontendowców.

## Required Outcome

Zawsze utwórz plik Markdown po polsku. Nie kończ na samej odpowiedzi w czacie, chyba że użytkownik wyraźnie poprosi o output tylko w czacie.

Zawsze zapisuj handoff pod ścieżką:
`docs/handoffs/YYYY-MM-DD-<topic>-frontend-handoff.md`

Jeśli slug tematu nie jest oczywisty, utwórz krótki, opisowy slug na podstawie funkcji lub obszaru API.

## Procedure

1. Inspect the relevant backend/API changes.
   - Identify affected routes, handlers, controllers, services, validators, serializers, and schemas.
   - Confirm whether the change is additive, breaking, or behavior-only.

2. Determine the frontend-visible contract.
   - List every created, changed, deprecated, or removed endpoint.
   - Capture HTTP method, path, auth requirements, query params, path params, request body, response body, error responses, pagination, sorting, and filtering behavior when applicable.

3. Trace type impact.
   - Always document created or changed API-facing types.
   - Because the frontend generates types automatically from the API, describe both:
     - the backend source of truth that changed
     - the resulting frontend type impact expected after regeneration
   - Include exact type names when they are available.
   - If exact generated names are uncertain, say that clearly and describe the structure that will change.

4. Add a dedicated `Types diff` section.
   - Always include a separate section named exactly `Types diff` in the handoff file.
   - Show what changed at the type level in a diff-like format.
   - Include added, removed, renamed, nullable, optional, and semantically changed fields when applicable.
   - If the exact generated output is unavailable, provide a best-effort contract diff based on the backend source of truth and clearly label assumptions.

5. Collect examples.
   - Include at least one concrete request example and one concrete response example for each materially changed endpoint.
   - Include error examples when they are important to UI behavior.
   - Prefer realistic values over placeholders when safe to do so.

6. Document edge cases explicitly.
   - Always include frontend-relevant edge cases.
   - Cover empty states, partial data, nullability, permission failures, validation failures, stale data, race conditions, retries, optimistic update concerns, and backward-compatibility concerns when relevant.
   - If no unusual edge cases were found, state that explicitly instead of omitting the section.

7. Translate to frontend implementation guidance.
   - Call out TanStack Query implications: query keys, invalidation, pagination, refetching, optimistic updates, retries, cache shape.
   - Call out Zustand implications: global state shape, resets, derived flags, persistence, cross-page synchronization.
   - Call out Next.js/React implications: server/client boundaries, route params, rendering states, loading and error UI, SSR/CSR effects.

8. Write the handoff file using the template at [frontend handoff template](./assets/frontend-handoff-template.md).
   - Fill every required section.
   - Remove sections only if they are truly not applicable, and briefly state why.
   - Keep the final document in Polish, including section content, explanations, action items, and open questions.

9. Validate completeness before finishing.
   - Confirm the document includes:
     - created/changed types
     - a `Types diff` section
     - affected endpoints
     - request examples
     - response examples
     - edge cases
     - frontend action items
     - open questions or assumptions

## Decision Rules

- If a change is breaking, label it clearly as **Breaking** near the top.
- If a change only affects internal backend logic and does not alter the frontend contract, do not generate a full handoff unless the user still wants one; instead, note that the frontend contract is unchanged.
- If multiple endpoints are affected by one feature, group them by user flow rather than by file.
- If the backend behavior differs by role, verification level, locale, or feature flag, document each branch.
- If an endpoint returns polymorphic or nullable shapes, show examples for each meaningful variant.
- If rate limits, idempotency rules, eventual consistency, or async processing affect UX, document them.
- The handoff content must be written in Polish, even if code symbols, endpoint names, or type names remain in English.
- If important information is missing, create the draft handoff anyway and add a clearly labeled **Open questions** section.

## Quality Bar

Dobry handoff jest:

- specific enough that a frontend engineer can implement without reopening backend code for basic questions
- explicit about changed types and schemas
- honest about uncertainty
- focused on contract and UX impact, not backend internals for their own sake
- written in clear Markdown with scannable sections and tables when useful

## Completion Checklist

Przed zakończeniem sprawdź wszystkie poniższe punkty:

- A `.md` handoff file was created.
- The file was saved under `docs/handoffs/`.
- The handoff body is written in Polish.
- Every changed endpoint is listed.
- Every created or changed type is listed.
- A `Types diff` section is included.
- Request and response examples are included.
- Edge cases are included explicitly.
- Frontend implications for Next.js, TanStack Query, and Zustand are covered when relevant.
- Assumptions and open questions are separated from confirmed facts.
- The final chat response includes the handoff file path and a short summary.
