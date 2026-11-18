---
name: note:form-popup-deployed-embed-check
description: "Owner manual check: does the Google Form actually render inside the Navbar 'Checkin popup' iframe on the deployed site (AC10, residuals R1-R5)"
date: 18-11-26
feature: none
---

# Backlog NOTE — Google Form popup on the deployed site

**BLUF:** The code is done and tested locally, but nobody has checked the real form inside the iframe on the deployed site. This is a manual owner check, not something the tests prove.

Source plan: `process/general-plans/active/navbar-google-form-popup_18-11-26/navbar-google-form-popup_PLAN_18-11-26.md` (AC10, residuals R1-R5).

## What to check (deployed site, after the code is deployed)
1. R1: open "Checkin popup" in the Navbar; the form shows inside the popup and an answer can be submitted.
2. R2: response headers from the hosting (CSP, X-Frame-Options) do not block the `docs.google.com` iframe. The repo itself sets none (gate G9).
3. R3: repeat in a browser that blocks third-party cookies (Safari; Chrome with blocking on). If the form needs a Google login or "one response per person", the iframe may show an error; the "Mở trong tab mới" link must still work.
4. R4 / O5: decide whether a privacy or cookie notice is needed for the embedded Google content.
5. R5: keyboard and screen reader across the iframe boundary; iOS Safari (address bar, safe area, scrolling inside the iframe).

## Local observation (not proof)
On 2026-11-18 a local `next start` probe showed the real form ("PHIẾU CHECK-IN POP-UP REPLY 199X") inside the iframe at 360px. This is a local observation only, not deployed-site evidence.

TL;DR: owner opens the popup on the live site in two browsers and confirms the form loads and submits.
