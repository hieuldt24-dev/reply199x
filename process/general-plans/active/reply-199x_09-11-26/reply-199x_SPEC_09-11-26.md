---
name: spec:reply-199x
description: "Preserve the REPLY 199X experience and complete maintainable agent guidance."
date: 09-11-26
feature: general
---
# REPLY 199X — Requirements

**Date:** 09-11-26  
**Status:** LOCKED — scope authorized by the user's “thực hiện cả 2”; implementation is not yet verified.

## Summary

Replace the starter page with the supplied Vietnamese REPLY 199X event experience, retaining its nostalgic identity and content. Complete the project guidance so future agents can safely maintain individual parts of the page. Visitors should be able to explore the project, read the event and ticket information, follow the supplied merchandise and social links, and prepare a message without being told that an unsent message was delivered.

## User Stories / Jobs To Be Done

- As a visitor, I want the original Vietnamese retro experience, so that the project retains its identity.
- As an attendee, I want clear dates, locations, benefits and ticket availability, so that I can understand the event without mistaking a preview for a sale.
- As a merchandise customer, I want the supplied ordering destination, so that I can continue through the organizer's existing channel.
- As a mobile or keyboard visitor, I want usable navigation and readable content, so that I can reach every section.
- As someone contacting the team, I want an honest message-preparation flow, so that I understand whether anything has been sent.
- As a future maintainer or agent, I want accurate, discoverable guidance, so that I can change one part without disrupting the rest.

## What The User Wants (Behavioral Outcomes)

The page keeps the introduction, official channels, timeline, concert and ticket area, merchandise, attendance process and contact information in the supplied order. It retains the original copy, dates, prices, links and green, cream, red and gold aesthetic. Ticket sales and the Facebook page remain visibly pending.

Visitors can move between sections on desktop and mobile. Content remains readable when external images fail. Message fields have meaningful labels and validation; preparation preserves entered text and explains that the site does not send or save messages. A usable email alternative is available.

Agents can discover the component responsibilities, shared visual rules, interaction limits and verification procedure. Guidance clearly distinguishes implemented behavior from proposals and unavailable services.

## Flow / State Diagram

```text
[Open page] --> [Explore sections] --> [Read event / ticket status]
                      |                          |
                      |                          +--> [Sales not open]
                      +--> [Merchandise] --> [Open supplied order form]
                      +--> [Official channel] --> [Open TikTok]
                      |                          [Facebook pending]
                      +--> [Contact] --> [Enter message]
                                            |
                                 +----------+----------+
                                 |                     |
                            [Invalid fields]      [Prepare message]
                                 |                     |
                              [Correct]       [Preview / open email]
                                              [No delivery claim]

[Future agent] --> [Find guidance] --> [Understand ownership and limits]
                                    --> [Make scoped change and verify]
```

## Acceptance Criteria (Testable Outcomes)

- **AC1:** All eight main sections and the nested ticket area appear in the original order, with working existing section destinations and Vietnamese text preserved.
  - proven by: content-and-section browser smoke checks against the preserved reference.
  - strategy: Fully-Automated.
- **AC2:** The page retains the reference's recognizable retro palette, typography, paper textures, cassette motifs and dimensional styling.
  - proven by: source-to-page visual comparison at the responsive inspection widths.
  - strategy: Hybrid — automated screenshots plus visual assessment of identity.
- **AC3:** Event dates, location, time, ticket benefits, merchandise prices and promotion dates match the supplied content. Tickets remain “CHƯA BÁN VÉ” with price “SẮP CÔNG BỐ”; the attendance flow remains explicitly planned.
  - proven by: event-and-merchandise content assertions in browser smoke checks.
  - strategy: Fully-Automated.
- **AC4:** Merchandise links open the supplied order form, TikTok opens the supplied channel, and Facebook has no invented destination. Ticket notification leads to contact information without claiming a reservation.
  - proven by: CTA destination and pending-state assertions in browser smoke checks.
  - strategy: Fully-Automated.
- **AC5:** Navigation is available at 360, 390, 768, 1280 and 1440 pixels wide; the page has no horizontal overflow and section headings remain visible after navigating past the fixed header.
  - proven by: responsive overflow, menu interaction and anchor-position browser checks at all five widths.
  - strategy: Fully-Automated.
- **AC6:** Keyboard visitors can reach navigation, calls to action and message controls, see their focus position and skip to the main content. Every message field has an associated label.
  - proven by: keyboard navigation, focus and field-label browser checks.
  - strategy: Hybrid — automated semantic/focus assertions plus visible-focus inspection.
- **AC7:** An incomplete or invalid message cannot proceed. A valid preparation keeps entered values, provides a useful preview or email action, and explicitly states that the site has not sent or saved the message.
  - proven by: contact invalid/valid preparation, retained-values and truthful-status browser checks; no external email is sent during verification.
  - strategy: Fully-Automated.
- **AC8:** When either supplied image fails, meaningful fallback content remains visible and event details remain readable. Reduced-motion preferences stop nonessential motion.
  - proven by: failed-image and reduced-motion browser checks.
  - strategy: Fully-Automated.
- **AC9:** Maintainers can discover guidance covering each page section, shared navigation/footer ownership, visual rules, interaction limits and verification steps, including when the project is not a Git repository.
  - proven by: context discovery/routing validators and guidance completeness review.
  - strategy: Hybrid — automated discovery assertions plus review of documented responsibilities.
- **AC10:** The converted site passes the existing code-quality and production-build checks without adding project dependencies or claiming that these checks prove visual fidelity.
  - proven by: sequential project check and production-build gates, with separately recorded browser evidence.
  - strategy: Fully-Automated.

## Out Of Scope

- Ticket checkout, payment, reservation, account creation, message delivery or storage.
- Verifying that external providers fulfill orders, deliver email or maintain their pages.
- A new Facebook destination, invented event information, a redesign or replacement promotional assets.
- Publishing the site, initializing Git or adding project dependencies.

## Constraints

- Preserve the supplied Vietnamese content, section order, existing section destinations, branding and supplied external links.
- Keep ticket and unavailable-channel states honest; do not fabricate transaction or delivery success.
- Preserve existing merchandise ordering through the supplied external form.
- Keep maintenance boundaries understandable and interactive behavior limited to the parts that need it.
- Verification must cover real browser behavior as well as code/build checks. Screenshots cannot establish external transaction success.
- External images and fonts remain third-party dependencies; fallback behavior is part of acceptance.

## Open Questions

None blocking this scope. Ticket sale details, real message transport, official Facebook destination, hosting and asset ownership remain future organizer decisions; their absence is represented explicitly and does not prevent this conversion.

## Background / Research Findings

The user selected both offered tasks with “thực hiện cả 2”. Research found an English starter, a preserved Vietnamese HTML reference, a missing component-guidance document and a discovery tool that assumed Git was available. The original contact form showed a saved-success message without sending or storing anything. The original merchandise buttons already used the organizer's Google Form.

Reference: `process/general-plans/completed/harness-bootstrap_09-11-26/reply-199x.reference.html`. Context consulted: `process/context/all-context.md`, `uxui/all-uxui.md`, `planning/all-planning.md` and `tests/all-tests.md`. The existing verification commands are `npm.cmd run check` followed by `npm.cmd run build`; there is no application test suite. Browser smoke verification must exercise the research-enumerated scenarios above with actual assertions; lint/build alone cannot close behavioral criteria. Existing browser tooling is available without adding a project dependency.

Verification mapping: check/build → AC10; context validators and guidance review → AC9; browser assertions at 360/390/768/1280/1440 → AC1, AC3–AC8; screenshots and reference comparison → AC2 and visible-focus portion of AC6. Evidence and remaining limitations belong in the execution report.

For the next phase, sequential planning is recommended: one scope, one source reference, one plan, no service dependencies. Parallel planning would duplicate decisions; a generated workflow or coordinated agent team adds overhead without independent planning branches. INNOVATE may be skipped for the mechanical conversion, while implementation details remain the plan's responsibility.
