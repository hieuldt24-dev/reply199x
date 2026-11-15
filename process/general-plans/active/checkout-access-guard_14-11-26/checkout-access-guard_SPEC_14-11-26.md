---
phase: SPEC
date: 2026-11-14
status: review-required
---
# Checkout access and responsiveness requirements

## Summary
Prompt visitors to sign in when they first enter the site, protect checkout from repeated abandoned orders, and reduce unnecessary waiting and background activity without weakening payment correctness. An account with three distinct expired unpaid orders in one hour cannot create new checkout orders for 24 hours.

## User Stories / Jobs To Be Done
1. As a visitor, I want a clear sign-in prompt on arrival so I can continue with my account.
2. As a signed-in visitor, I want to enter without another login prompt.
3. As an organizer, I want repeated unpaid checkout creation temporarily restricted so one account cannot repeatedly consume checkout resources.
4. As a customer, I want retries and confirmed payments treated correctly even when my checkout access is restricted.
5. As a customer, I want responsive checkout and status updates without unnecessary repeated loading.

## What The User Wants (Behavioral Outcomes)
- A signed-out visitor sees the login form on initial page entry. The form remains dismissible; dismissing it does not immediately reopen it during the same page visit. A new full page entry may prompt again. These are proposed defaults for review.
- Signed-in users do not see the automatic prompt. A temporary sign-in service failure shows a recovery state rather than repeatedly forcing sign-in.
- Three distinct orders whose payment deadlines elapsed without payment in a rolling hour trigger a fixed 24-hour restriction on creating new checkout orders. The restriction starts when the threshold is first detected; rejected requests do not extend it.
- Count expiry times in the preceding hour, including the lower boundary and the current instant. Count each order once. Repeated requests for the same order do not create new strikes. Provider failures, paid orders and orders already needing payment reconciliation are excluded.
- A restriction explains its reason and the time checkout becomes available again. Existing order viewing, sign-in, payment confirmations and payment reconciliation continue working.
- When the restriction ends, old counted orders do not trigger it again. A later qualifying group of abandoned orders can trigger another restriction.
- Multiple tabs and simultaneous requests follow the same account restriction. Different accounts retain independent access.
- Data loading avoids redundant work, pauses unnecessary status checks while the page is hidden, and resumes checking when the user returns. No numeric capacity claim is made without measurements.

## Flow / State Diagram
```text
Enter site
  +-- signed in ----------> browse / checkout
  +-- signed out ---------> login prompt --> sign in or dismiss
  +-- auth unavailable ---> recovery message

Request checkout
  +-- retry existing order -----------------> existing result
  +-- active restriction ------------------> explain / show retry time
  +-- three qualifying expiries in one hour -> restrict new checkout 24h
  +-- allowed -----------------------------> create checkout

Verified payment --> update existing order --> synchronize registration
                     (continues during restriction)
```

## Acceptance Criteria (Testable Outcomes)
1. Initial signed-out entry opens one accessible login dialog; signed-in entry opens none. Dismissal does not cause an immediate reopening loop.
   - proven by: initial authenticated/anonymous dialog scenarios, keyboard dismissal and repeated render scenarios.
   - strategy: Fully-Automated
2. An authentication service failure presents recovery rather than falsely asserting that the user signed out.
   - proven by: unavailable-auth dialog and session-state scenarios.
   - strategy: Fully-Automated
3. Two qualifying expired orders allow checkout; the third qualifying expiry causes new checkout to be blocked for 24 hours, with an understandable retry time.
   - proven by: account threshold, rolling-window boundary and cooldown clock integration scenarios.
   - strategy: Fully-Automated
4. Paid, provider-failed and reconciliation orders are not strikes; replaying an existing request adds none.
   - proven by: checkout eligibility classification and idempotent replay integration scenarios.
   - strategy: Fully-Automated
5. Concurrent checkout requests across tabs cannot bypass the account policy or create multiple inconsistent restriction periods.
   - proven by: real-database concurrent account checkout integration gate; mocked route tests alone are insufficient.
   - strategy: Fully-Automated
6. Rejected attempts do not extend the restriction. Checkout recovers at the deadline without reusing the same old strikes; another account remains unaffected.
   - proven by: repeated denial, expiry, consumed-strike and independent-account integration scenarios.
   - strategy: Fully-Automated
7. Existing orders remain viewable and verified payments remain processable during restriction. No payment is confirmed from browser return parameters alone.
   - proven by: restricted-account existing-order, signed webhook and tampered-return regression scenarios.
   - strategy: Fully-Automated
8. Hidden status pages stop periodic checks, returning pages resume, and terminal orders stop polling. Leaving the page causes no stale UI update.
   - proven by: payment-status timer, visibility, terminal-state and navigation lifecycle scenarios.
   - strategy: Fully-Automated
9. Repeated focus events do not cause redundant overlapping reloads, and initial sign-in prompting adds no separate unnecessary session load.
   - proven by: auth focus lifecycle and request-count regression scenarios.
   - strategy: Fully-Automated
10. Comparable before/after checkout and status workloads record response times and request counts. Improvements must retain one provider checkout creation per logical order, correct ownership and correct payment amounts.
    - proven by: repeatable checkout/status workload integration gate plus existing provider/idempotency/ownership regressions; live production capacity remains a separate release evidence gap.
    - strategy: Hybrid

## Out Of Scope
- Permanent account bans, blocking sign-in or browsing, IP/device bans, and an administrator ban console.
- Automatically refunding payments or manually marking unpaid orders paid.
- Replacing the payment provider or rewriting the site architecture solely to introduce worker threads.
- Unmeasured promises about maximum users, guaranteed latency, or live provider throughput.

## Constraints
- User-confirmed threshold: three expired unpaid orders within one hour; restriction duration: 24 hours.
- Existing payment authentication, ownership, amount matching and prevention of duplicate provider checkout creation must remain intact.
- Payment-provider outages must not be mislabeled as deliberate user abandonment. Where historical evidence cannot distinguish them, ambiguous records must not count as strikes.
- Existing production credentials and personal information must not appear in diagnostic output.
- Real database concurrency requires integration evidence before production readiness can be claimed.

## Open Questions
None blocking artifact preparation. The stated popup dismissal/frequency and restriction start-time semantics are proposed defaults for the user's SPEC review; this document is not execution approval.

## Background / Research Findings
The user requested automatic login prompting, account checkout abuse prevention and better checkout/data-loading performance. They explicitly selected: “3 đơn hết hạn trong 1 giờ → khóa tạo checkout 24 giờ”.

Research found authoritative login state already available before rendering, a login dialog that currently starts closed, and a reload on every visible focus. Existing checkout protects retries with the same request identity but does not limit distinct orders from one account. Order expiry is demand driven, so a stored pending label alone does not prove an order is still active. Payment status currently polls every three seconds without a visibility pause. Existing payment leases prevent duplicate checkout creation for the same order and must be preserved.

Verification context provides automated domain, route and dialog tests with mocked external boundaries, but no installed browser end-to-end runner and no established real-database concurrency gate. The acceptance scenarios extend those discovered test areas; the database concurrency gate must be supplied and actually run in later phases. Source-backed requests and lifecycle reductions can be measured locally; external provider capacity is not assumed.

Strategy assessment for the next phase: sequential discussion is recommended (lowest coordination cost, one coherent security policy); parallel agents add little for a small requirements decision; a workflow adds useful later review gates; coordinated parallel work is disproportionate until independent implementation scopes exist. No implementation approach is selected by this SPEC.
