<!-- BEGIN:nextjs-agent-rules -->
# AGENTS.md — Manabii

## 1. Project Overview

**Project:** Manabii
**Tagline:** Every day, a little more Japanese.
**Category:** Japanese Language Learning Platform / EdTech SaaS
**Framework:** Next.js App Router
**Language:** TypeScript
**Database:** PostgreSQL
**ORM:** Prisma

Manabii is a Japanese learning platform designed to support structured learning from JLPT N5 to N1.

Core learning modules:

* Kotoba (Vocabulary)
* Bunpou (Grammar)
* Kanji
* Dokkai (Reading)
* Sakubun (Writing)
* Choukai (Listening)
* Kaiwa (Speaking)
* JLPT Practice
* Learning Progress
* AI Tutor

The initial release focuses on a functional JLPT N5 learning experience.

All development must prioritize maintainability, security, accessibility, accurate learning content, and a consistent Manabii brand identity.

## 2. Core Engineering Principles

Always:

* Inspect existing code before changing it.
* Follow established project conventions.
* Use strict TypeScript.
* Prefer simple and maintainable solutions.
* Keep modules focused.
* Reuse shared components.
* Validate untrusted input.
* Enforce server-side authorization.
* Write tests for meaningful business logic.
* Document architectural decisions.
* Verify changes before declaring a feature complete.

Never:

* Overwrite existing work without inspecting it.
* Hardcode secrets.
* Trust client-submitted permissions or scores.
* Add unnecessary dependencies.
* Duplicate business logic.
* Ignore failing tests or type errors.
* Introduce unrelated refactoring.
* Claim unimplemented features are complete.
* Generate unverified Japanese educational content as authoritative.

## 3. Technology Standards

Use the configured project versions of:

* Next.js App Router
* React
* TypeScript
* Tailwind CSS
* shadcn/ui
* Lucide React
* PostgreSQL
* Prisma
* Auth.js
* Zod
* React Hook Form
* Vitest
* React Testing Library
* Playwright

Use TanStack Query or Zustand only when a concrete client-side state requirement justifies them.

Before adding dependencies:

1. Check existing dependencies.
2. Evaluate whether the package is necessary.
3. Confirm compatibility and maintenance status.
4. Document significant additions.

Do not arbitrarily upgrade core dependencies.

## 4. Architecture

Use a modular monolith architecture.

Suggested business modules:

* auth
* users
* curriculum
* vocabulary
* grammar
* kanji
* reading
* writing
* listening
* speaking
* exercises
* progress
* admin

Maintain separation between:

* UI and presentation.
* Application and business logic.
* Database access.
* Infrastructure integrations.

### Next.js

* Prefer Server Components by default.
* Use Client Components only when interactivity requires them.
* Keep client boundaries small.
* Use Server Actions for appropriate form mutations.
* Use Route Handlers for API use cases.
* Keep database access server-side.
* Do not expose secrets to client components.
* Avoid calling internal HTTP endpoints from Server Components when direct service calls are suitable.

Keep domain logic independent of React components.

## 5. Manabii Brand and UI/UX

All user-facing interfaces must consistently use the Manabii identity.

### Brand Identity

Name: Manabii
Tagline: Every day, a little more Japanese.
Inspiration: 学び (Manabi — learning)

### Visual Style

* Japanese-inspired minimalism.
* Warm ivory backgrounds.
* Vermilion red as the primary brand accent.
* Deep charcoal text.
* Muted teal or green for learning progress.
* Subtle borders and shadows.
* Spacious layouts.
* Consistent spacing and typography.
* Restrained use of animations.

Initial design tokens:

* Brand: #D94A38
* Text: #252525
* Background: #FAF8F2
* Surface: #FFFFFF
* Success: #4C8A7A
* Border: #EAE7DF

Centralize design tokens and avoid hardcoding repeated color values throughout the application.

### Brand Mark

Use the approved Manabii logo assets when available.

The intended logo direction is an original minimal symbol inspired by a growing sprout or origami, representing continuous learning.

Do not generate inconsistent logo variations on different pages.

Do not use copied or unlicensed brand assets.

### User Experience

* Responsive desktop, tablet, and mobile layouts.
* Desktop learning sidebar.
* Mobile-friendly navigation.
* Accessible forms and controls.
* Consistent component patterns.
* Clear loading, success, error, and empty states.
* Readable Japanese typography and furigana.
* Keyboard accessibility.
* Visible focus indicators.
* Reduced-motion support.

Avoid generic, cluttered, or excessively playful interfaces.

## 6. TypeScript and Code Style

* Strict TypeScript must remain enabled.
* Avoid `any`.
* Prefer explicit contracts for exported functions.
* Validate runtime input with Zod.
* Use appropriate inferred Prisma types.
* Avoid unsafe type assertions.
* Keep functions focused.
* Use descriptive names.

Naming:

* PascalCase for components and types.
* camelCase for variables and functions.
* kebab-case for route segments where appropriate.
* Domain-specific names for services and business operations.

Comments should explain reasoning and non-obvious decisions rather than restating code.

## 7. Database and Prisma

Use PostgreSQL and Prisma.

Requirements:

* UUID primary keys.
* Explicit relations.
* Appropriate indexes.
* Unique constraints.
* Created and updated timestamps.
* Safe deletion policies.
* Transactions for atomic business operations.
* Reviewed schema migrations.
* Idempotent seed data.

Avoid:

* N+1 queries.
* Unbounded queries.
* Fetching unnecessary columns.
* Deleting important learning history.
* Duplicating authoritative progress information without a reconciliation strategy.

When changing the database:

1. Update the Prisma schema.
2. Generate and review the migration.
3. Update services and types.
4. Update seed data if needed.
5. Add or modify tests.
6. Document operational impact.

Never silently remove data-bearing fields or relations.

## 8. Authentication and Authorization

Use Auth.js with secure session management.

Roles:

* STUDENT
* CONTENT_EDITOR
* ADMIN

Rules:

* Enforce authorization on the server.
* Validate user identity for protected operations.
* Verify ownership of personal learning records.
* Check permissions on every sensitive mutation.
* Protect administrative routes and APIs.
* Do not trust client-supplied roles or user IDs.
* Never expose private session credentials.

UI-level restrictions are not a substitute for server-side authorization.

## 9. Japanese Learning Content Standards

Educational accuracy is a core product requirement.

### Kotoba

* Store the Japanese expression, reading, meaning, part of speech, level, and examples.
* Use verified readings and translations.
* Avoid treating similar words as interchangeable without explanation.

### Bunpou

Each grammar pattern should distinguish:

* Meaning.
* Formation.
* Usage.
* Register.
* Examples.
* Common mistakes.
* Related patterns.

Do not claim two grammar patterns are equivalent unless that is supported by reliable educational references.

### Kanji

* Separate onyomi and kunyomi.
* Use verified readings and meanings.
* Store stroke information only when supported by a reliable source.

### Furigana

* Display furigana consistently.
* Make it accessible.
* Allow configurable display when appropriate.
* Do not fabricate readings.

### JLPT

* Associate content with an appropriate learning level.
* Do not claim official certification without authoritative verification.
* Keep the curriculum extensible from N5 to N1.

### AI-Generated Content

* Treat AI output as unverified.
* Keep AI suggestions separate from reviewed curriculum content.
* Preserve original student submissions.
* Do not silently overwrite reviewed learning material.
* Present uncertainty when relevant.

## 10. Learning Progress

Progress must be based on persisted records.

Track:

* Lesson completion.
* Exercise attempts.
* Quiz results.
* Vocabulary reviews.
* Kanji reviews.
* Daily learning activity.
* Learning streak.
* Study time when reliably measured.

Rules:

* Calculate authoritative scores on the server.
* Avoid duplicate progress events.
* Use consistent timezone rules.
* Preserve relevant learning history.
* Ensure dashboard values agree with source records.
* Do not fabricate duration or mastery metrics.

### Spaced Repetition

Keep the scheduling algorithm independent and testable.

Store review events, outcomes, and next review timestamps.

Make intervals configurable and handle duplicate review submissions safely.

## 11. API and Validation

Use Zod for all untrusted inputs.

* Maintain consistent API response conventions.
* Return appropriate HTTP status codes.
* Handle expected failures explicitly.
* Enforce authorization before sensitive mutations.
* Apply rate limiting to abuse-prone operations.
* Do not leak raw internal exceptions.
* Validate file uploads.
* Calculate quiz scores on the server.

Treat all browser-submitted data as untrusted.

## 12. AI Integration

AI services must be accessed only from server-side modules.

Use a provider abstraction to avoid coupling domain logic to one vendor.

Potential Manabii AI features:

* Bunpou explanations.
* Writing feedback.
* Vocabulary assistance.
* Conversation simulation.
* Personalized learning suggestions.

Requirements:

* Keep API keys private.
* Validate AI requests and responses.
* Handle timeouts and failures.
* Apply rate limits.
* Monitor usage when appropriate.
* Respect user privacy.
* Clearly label AI-generated feedback.
* Keep core learning functions available without AI.

## 13. Frontend State

Use the simplest suitable state-management approach.

* Server Components for server-rendered data.
* Local React state for isolated interactions.
* URL parameters for shareable filters and pagination.
* TanStack Query when client-side server-state management is justified.
* Zustand only for genuinely shared client state.

Avoid unnecessary effects, duplicated server state, and excessive global state.

## 14. Security and Privacy

* Keep secrets in environment variables.
* Validate all untrusted inputs.
* Enforce server-side authorization.
* Protect private user records.
* Use secure authentication configuration.
* Validate uploaded media.
* Avoid sensitive information in logs.
* Apply appropriate security headers.
* Protect AI endpoints from abuse.
* Consider privacy and consent before sending user content to external AI services.

Never expose database credentials, private tokens, API keys, or sensitive user data.

## 15. Testing

Use:

* Vitest for unit and integration tests.
* React Testing Library for component tests.
* Playwright for end-to-end tests.

Prioritize tests for:

* Authentication.
* Authorization.
* Quiz scoring.
* Vocabulary reviews.
* Spaced repetition.
* Lesson completion.
* Progress calculations.
* Admin publishing.
* Student learning journeys.

Tests should be deterministic where practical and use isolated data.

Never report tests as passing unless they have actually been executed successfully.

## 16. Performance and Reliability

* Minimize client-side JavaScript.
* Optimize database access.
* Implement pagination.
* Optimize images and media.
* Lazy-load appropriate resources.
* Use caching only with defined invalidation rules.
* Provide loading and error states.
* Avoid unnecessary rerenders.
* Handle external service failures gracefully.
* Avoid premature optimization without evidence.

## 17. Accessibility

Every feature must consider:

* Semantic HTML.
* Keyboard navigation.
* Screen reader labels.
* Accessible validation errors.
* Visible focus states.
* Appropriate color contrast.
* Accessible audio controls.
* Reduced-motion preferences.
* Responsive typography.

Accessibility must be incorporated during implementation, not added only at the end.

## 18. Admin Content Management

Admin functionality must support:

* Draft creation.
* Content editing.
* Preview.
* Publication.
* Archiving.
* Content relationships.
* Appropriate audit information.

Only authorized users can manage content.

Prevent unfinished or unpublished material from being exposed to students through either UI or APIs.

## 19. Error Handling and Observability

* Use consistent error structures.
* Distinguish validation, permission, not-found, and internal errors.
* Log unexpected failures safely.
* Avoid logging secrets or private user content.
* Include useful diagnostic context.
* Keep logging compatible with the deployment environment.

## 20. Documentation

Maintain:

* README.md.
* Architecture documentation.
* Database and ERD documentation.
* Environment variable documentation.
* API documentation where appropriate.
* Local development instructions.
* Testing instructions.
* Deployment instructions.
* Content authoring guidance.

Update documentation when implementation changes invalidate prior instructions.

## 21. Git and Change Management

* Make focused changes.
* Review existing changes before editing.
* Do not discard user modifications.
* Avoid unrelated refactoring.
* Do not commit secrets.
* Do not force-reset or rewrite history without explicit approval.
* Review diffs before finalizing.
* Use meaningful commit messages when requested.

## 22. Definition of Done

A feature is complete only when:

* Acceptance criteria are satisfied.
* It follows the existing architecture.
* Validation and authorization are implemented.
* Loading, empty, and error states are addressed.
* Database changes have appropriate migrations.
* Relevant tests have been written and run.
* Type checking and linting pass for the relevant scope.
* Documentation is updated where necessary.
* No known critical security or data-integrity issue remains.

Clearly report incomplete work and known limitations.

## 23. AI Agent Workflow

For every task:

1. Read this AGENTS.md.
2. Inspect the relevant existing code.
3. Identify affected modules.
4. Review architectural and security implications.
5. Present a concise implementation plan for substantial changes.
6. Implement a focused vertical slice.
7. Add relevant tests.
8. Run checks.
9. Review the final changes.
10. Update documentation.
11. Summarize the outcome and remaining work.

Do not implement unrelated features.

Ask for clarification when an unresolved decision materially affects security, privacy, architecture, or irreversible data operations.

For low-risk ambiguities, use a sensible default and document the assumption.

## 24. Product Principle

**Manabii should make learning Japanese structured, approachable, and measurable.**

Prioritize:

* Accurate learning content.
* Functional features.
* A consistent brand experience.
* Strong data integrity.
* Maintainable architecture.
* Security and privacy.
* Accessibility.
* Sustainable product development.

Build real functionality rather than superficial UI placeholders.

Every implementation should contribute to a cohesive Manabii learning experience.

<!-- END:nextjs-agent-rules -->
