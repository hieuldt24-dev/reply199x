# Ticket Registration to Google Sheets

**TL;DR:** Ticket request submissions are saved to the confirmed registration sheet, with clear success or retry feedback. Submission does not reserve or purchase a ticket.

## Summary

People who submit the ticket request popup can send their details to the organizers’ registration sheet instead of relying on an email draft. They see confirmation only after the submission is recorded. This records a request; it does not mean tickets are on sale, reserved, or purchased.

## User Stories / Jobs To Be Done

- As an attendee, I want to send my ticket request from the popup, so the organizers receive the details I entered.
- As an attendee, I want clear confirmation or a chance to retry, so I know whether my request was recorded.
- As an organizer, I want each request recorded in the agreed columns, so I can review the submitted details consistently.

## What The User Wants (Behavioral Outcomes)

- The existing ticket popup accepts the attendee’s name, email, optional phone number, ticket quantity, and merchandise choice.
- A valid submission is recorded in the designated registration sheet as one row, using the confirmed column names and order.
- The attendee sees a clear success message only after the row is recorded. The message describes a received request, not a ticket reservation or purchase.
- If the submission cannot be confirmed, the attendee sees a generic retry message and the entered values remain available.
- The form communicates when it is submitting and prevents repeat activation from creating an accidental duplicate.
- Submission feedback is accessible to keyboard and assistive-technology users.

## Flow / State Diagram

```text
[Open ticket request popup]
             |
             v
[Enter request details] --> {Details valid?}
                              | no
                              v
                   [Show validation feedback]
                              |
                              +----> [Edit details]
                              |
                              | yes
                              v
                    [Submit; show pending state]
                              |
                 [Repeated activation ignored]
                              |
                              v
                    {Request recorded?}
                       | yes          | no / uncertain
                       v              v
             [Show received notice]  [Show generic retry notice;
             [No sale/reservation]    preserve entered values]
                                            |
                                            +----> [Retry]
```

## Acceptance Criteria (Testable Outcomes)

- **AC1:** The form requires a name and a valid email address, accepts an omitted phone number, and allows only ticket quantities from 1 through 4.
  - `proven by:` ticket-popup-required-fields-and-quantity-boundaries scenario
  - `strategy: Fully-Automated`
- **AC2:** A valid submission records one row in the `Registrations` sheet with these columns, in this order: `Thời gian`, `Họ tên`, `Email`, `Điện thoại`, `Số vé`, `Merch`; each value matches the submitted request.
  - `proven by:` ticket-request-to-registration-row scenario, including field-to-column mapping
  - `strategy: Fully-Automated`
- **AC3:** The popup shows a success message only after the request is recorded, and the message does not claim that a ticket is reserved or purchased.
  - `proven by:` ticket-request-confirmation-after-recording scenario
  - `strategy: Fully-Automated`
- **AC4:** When recording fails or its result cannot be confirmed, the popup shows a generic retry message, retains the entered values, and does not expose private service details.
  - `proven by:` ticket-request-failure-and-retry scenario
  - `strategy: Fully-Automated`
- **AC5:** Repeated activation of the submit control while a request is pending does not create more than one row for that submission.
  - `proven by:` ticket-request-repeated-submit scenario
  - `strategy: Fully-Automated`
- **AC6:** Submitting, pending, success, and failure feedback can be reached and understood using the keyboard and is announced through accessible status feedback.
  - `proven by:` ticket-popup-keyboard-and-status-feedback scenario
  - `strategy: Hybrid` (automated browser accessibility assertions plus a manual keyboard and screen-reader check)

## Out Of Scope

- Contact form changes, contact-message delivery, or authentication.
- Ticket sales, payment, seat assignment, purchase, or reservation confirmation.
- Merchandise checkout or fulfillment.
- Changing the agreed sheet tab or adding, removing, or reordering its columns.
- Broader redesign of the event site.

## Constraints

- This change applies only to ticket request submissions.
- The target tab is `Registrations`; the confirmed column order is `Thời gian`, `Họ tên`, `Email`, `Điện thoại`, `Số vé`, `Merch`.
- Keep private service credentials server-side. Do not expose credentials or detailed provider errors in the browser.
- Do not describe a recorded request as a ticket sale, reservation, or purchase; ticket sales are not open.
- Preserve the current request fields and limits: name and email are required, phone is optional, and quantity is 1–4.

## Open Questions

None. The target tab and column order are confirmed.

## Background / Research Findings

- The current ticket popup collects the request fields, then opens an email draft and closes; it does not save a request.
- The existing ticket experience states that sales are not open. The new confirmation must not imply a reservation or purchase.
- The organizer confirmed the `Registrations` tab and its six column headings and order.
- Server-side spreadsheet configuration is present in the local environment. This SPEC records no credential values, and no credentials or external services were accessed while preparing it.
- The project has no application unit, integration, or end-to-end test runner today. Existing lint, typecheck, and build checks do not prove spreadsheet delivery; browser checks are available through `agent-browser`. The later plan must define automated coverage for the automatable submission paths without choosing a test tool in this SPEC.
