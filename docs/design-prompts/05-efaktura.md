# 05 — e-Faktura

**Depends on:** `00-foundation.md`
**Background:** [architecture blueprint](../inventory-portal-architecture.md) §7

## Your task

Design the electronic invoicing experience: issuing an e-Faktura when selling, and reviewing then
accepting or rejecting a supplier's e-Faktura when receiving.

This is a regulated flow. Getting it wrong has tax consequences for the customer, so the design
should favour clarity and deliberate confirmation over speed. That is the opposite of the priority
in receiving and counting, and the difference should be felt.

## Essential background

e-Faktura is the North Macedonian tax authority (УЈП) electronic invoicing platform. A document is
built as JSON, signed with the taxpayer's **qualified certificate**, and submitted. On success the
platform returns a **EUID** (unique invoice id), a receipt timestamp, and a link that must be
printed on the document **as a QR code**.

Two facts that shape the entire design:

1. **Signing happens in the browser, with the user's own certificate or USB token.** The platform
   never holds a private key. There is therefore **no unattended sending** — a document waits until
   a person with a certificate signs it. "Awaiting signature" is a normal, designed state, not an
   error.
2. **Issuing and receiving are not symmetric.** When selling we *create* a document. When receiving
   we do not — the supplier already issued it and it exists on the platform. We can only match it to
   our delivery and accept or reject it.

e-Faktura is **not** the same as fiscalization. A walk-in retail sale produces a fiscal receipt from
certified hardware; an invoice to a company produces an e-Faktura. Never imply one replaces the
other.

## Flow A — issuing (after a sale)

### Invoice entry point and follow-up

Offer an inline invoice choice in the sale flow and a non-blocking **Create invoice** action on the
posted sale. Put unfinished work in Documents. Do not open a mandatory dialog after every sale.
Reuse known customer/document details and explain missing information inline. Invoice eligibility
and required fields still follow document rules; simplifying navigation does not waive them.

### The issue form

Prefill everything already known — lines, quantities, prices, VAT indicators, seller identity,
totals — and ask only for what is genuinely missing:

- Buyer: **ЕДБ** (tax number) and registered name. These are validated against the tax register and
  a mismatch is the single most common rejection, so design a good error for it.
- Document type: `100 Фактура`, `160 Фактура/Испратница` (invoice + delivery note), or
  `170 Фактура кон физичко лице` (to a natural person).
- Payment type, delivery date, any reference document.

Show the computed totals broken out by VAT rate and tax indicator, exactly as they will be
submitted. The user is attesting to these numbers.

### Signing

The hand-off to the browser extension is unusual and needs explaining, not hiding:

1. Review the document.
2. Sign — the extension prompts for the certificate or token, possibly a PIN.
3. Submit.
4. Success: EUID, timestamp, QR code.

Design the waiting state, the "no certificate found" state, the "certificate expired" state, and
the "wrong certificate for this company" state. Each needs a concrete next step, because none of
them is something a user can guess their way out of.

### The issued document

A printable/PDF-able view carrying the EUID as text **and** the QR code. Both are required. Also
design: certificate-expiry warnings ahead of time, and the status of each document.

### Statuses

Use the platform's own vocabulary — do not invent a parallel one:

| Code | Macedonian | Meaning |
|---|---|---|
| 00 | Нацрт | Draft, not sent |
| 01 | Испратена | Sent, awaiting the buyer |
| 03 | Прифатена | Accepted by the buyer |
| 04 | Автоматски прифатена | Auto-accepted after the deadline |
| 05 | Одбиена | Rejected, with a reason |
| 07 | Сторнирана | Cancelled |
| 09 | Корегирана | Corrected |
| 10 | Евидентирана | Recorded |

### Cancel and correct

**Сторно** cancels a document. **Корекција** replaces it with a corrected one. Both need an official
reason code from a fixed list. Design the pickers, and make the difference between cancelling and
correcting unmistakable — they have different consequences and users will confuse them.

Also design **Книжно одобрение** (credit note, reduces what the buyer owes) and **Книжно
задолжение** (debit note, increases it).

## Flow B — receiving: match, verify, then decide

### Matching

After a goods receipt posts, offer a follow-up link and Documents task to match an incoming
e-Faktura, without interrupting routine receiving. Show pending documents from
the platform with supplier, date, number and total; suggest likely matches by supplier and amount,
but never auto-accept a match.

### The two-step review — the most important screen in this prompt

Accepting a supplier's invoice is a financial and tax act. A one-click accept beside a list of
deliveries is precisely how a wrong invoice gets approved, so acceptance is deliberately two steps.

**Step 1 — compare.** The invoice is re-read from the platform and shown **line by line against
what was actually received**. Differences in quantity, unit price, VAT and totals are highlighted
and quantified. Make discrepancies impossible to overlook; this comparison is the entire value of
the screen.

**Step 2 — confirm.** An explicit confirmation ("I have checked this invoice against the delivery")
must be ticked before **Accept** or **Reject** becomes enabled. Design this so it reads as a
meaningful attestation rather than a nuisance checkbox — the person is putting their name to it,
and the record stores who confirmed, when, and against which receipt.

Rejection requires an official reason code (wrong VAT, order error, wrong buyer details, and so on)
plus an optional comment. Design that as a deliberate, explainable act.

### Incoming document list

Everything received: status, supplier, date, amount, matched receipt, and what needs attention.
Documents awaiting a decision have a deadline — after it they are **auto-accepted**. Surface that
deadline clearly and with increasing urgency as it approaches, because passive auto-acceptance is a
silent financial commitment.

## Failure states

The platform can reject a submission. Show errors in plain language with the underlying code
available for support. Common ones worth designing: company not found in the tax register
(`E1000`), user not authorised to sign for this company (`E1013`), certificate not registered
(`E1012`), document no longer in a changeable state (`E1016`).

Also design: platform unreachable (queued, will retry), and the awaiting-signature worklist.

## The rule that must survive into the design

**Stock movement never depends on the tax platform.** A sale or a receipt posts to the ledger
after its own stock, price, cost and permission validations. Every e-Faktura step is separate and
independently retryable. Nothing in
these screens may imply that a failed or pending invoice undoes the physical stock movement.

## Permissions and worker hand-off

Follow `README.md` and IPD-031. Separate invoice preparation/matching, signing/submission,
acceptance/rejection, correction/cancellation and financial export permissions. The finance preset
is a proposal, not automatic authority for every invoice action. A receiver may post stock without
being allowed to accept the supplier's invoice. A preparer without signing authority sends work to
the authorized person's worklist; signing still requires the correct certificate and company scope.
Check permissions/document state again before the final action. Changing a reviewed document
invalidates its earlier approval. Preserve the explicit line comparison and acceptance confirmation.
The server filters documents and financial fields by authorized scope, including search and exports.

## Deliverables

The inline invoice entry point and follow-up task; the issue form (prefilled, with a validation error, ready to sign); the
full signing sequence with all failure states; the issued document with EUID and QR; сторно and
корекција flows; credit and debit notes; incoming list with deadline urgency; the matching screen;
the two-step review with a clean match and with discrepancies; the reject flow; the
awaiting-signature worklist; preparer/signer/acceptance-authorized and revoked-access variants;
and status badges for all eight statuses.
