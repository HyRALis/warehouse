# Fiscal-printer integration and OmniStock delivery estimate

Updated 2026-09-05 after the founder selected **our own POS, developed after inventory**. External
POS integration is no longer a requirement. This section replaces the earlier integration-choice
recommendations preserved below as research history. No POS implementation is requested yet.

**Official developer interface found**

[Accent's developer downloads](https://accent.com.mk/?page_id=1282) lists PF550/PF700 control-code
manuals, a separate cash-register manual for SY55/SY46/SY47/SY250, input-file examples, and Windows
ecr.dll/ecrprint utilities. The listing labels the Windows library/application as .NET 2.0. Verify
current support, redistribution terms and target firmware before choosing that dependency.

The downloadable [PF550 English protocol v136](https://accent.com.mk/downloads/Control_codes_PF550_v136_EN.doc)
was retrieved and its readable protocol/command sections inspected locally. It describes serial
RS232 communication, framed commands, checksum, sequence number and device-status responses.

| Receipt operation | Command in that document |
|---|---|
| Start fiscal receipt | 48 / 0x30 |
| Add sale line | 49 / 0x31 |
| Register tender | 53 / 0x35 |
| Finish fiscal receipt | 56 / 0x38 |
| Read device status | 74 / 0x4A |
| Inspect fiscal transaction | 76 / 0x4C |

The manual specifies repeated-frame handling with the same sequence number and supplies recovery
queries. This is not permanent sale-level deduplication. These are documented examples for that
protocol version, not verified commands for every current device. The download page also lists a
newer Macedonian PF550/PF700 v140 file; reconcile the exact target's documentation before coding.

**Recommended architecture — proposed implementation judgment**

Our POS calls the shared sale service to validate prices and reserve stock. A small local fiscal
bridge on the till computer receives the approved structured receipt, communicates with the device,
and returns a confirmed receipt result or an explicit uncertain outcome. The sale service commits
the stock/revenue effects once. One printer has one serialized command stream and a durable local
job journal, so a browser refresh is not a new receipt request.

The bridge can use a currently supported manufacturer SDK or our own tested protocol adapter;
that choice follows a real-device proof. Begin with one printer family and one operating system.
Do not treat a fiscal receipt as a PDF, browser print job or arbitrary receipt-printer text. The
adapter maps item description, quantity, price, discount, tax group and tender into fiscal commands.
Tax-group mapping and totals must be reconciled with the device's configured values.

Persist stock reservation, sale ID, price versions, bridge job ID, device ID, attempts and confirmed
fiscal identifiers. On paper-out, disconnected cable, power loss, or a lost closing response, query
and reconcile the outcome. Never assume a timeout means nothing printed. Do not release reserved
stock or start a second receipt while the first outcome remains uncertain. A controlled test must
prove recovery after the printer finishes but the server never receives the response.

Browser-direct serial access is another option: [Chrome Web Serial](https://developer.chrome.com/docs/capabilities/serial)
supports serial devices, including USB devices exposing serial ports, with user-granted access.
For the first production design I favor a local bridge for durable job ownership and controlled
recovery; that is an architectural recommendation, not a claim that browser access cannot work.

The first device proof needs the exact model/firmware, cable/port, supported driver or protocol,
character encoding for Macedonian text, configured VAT/payment groups, and an appropriately
provisioned test device/provider procedure. Verify normal receipt, discounts, multiple VAT groups,
returns/voids, device limits and restart recovery. Do not use live fiscal receipts for demo/load
generation. No hardware was operated and no driver/SDK was installed during this research.

**Planning estimate, not a delivery commitment**

Estimate for remaining work from the current vendor/platform foundation, assuming one experienced
full-time engineer using AI assistance, prompt founder feedback, and access to real-device and
UJP testing. Inventory comes first, then POS. These are engineering estimates, not sourced market
benchmarks. A pilot-ready product is distinct from every reporting/refinement item in the blueprint.

| Stage | Estimated engineering/calendar time at that staffing |
|---|---|
| Pilot-ready inventory: opening setup, receipt costs, item/batch prices, counts/transfers, corrections/returns/losses, useful analytics, access control and accepted launch e-Faktura scope | 14–22 weeks |
| Our POS: checkout/scanning, shared stock authorization, price/batch selection, tender recording, till sessions/cash reconciliation and one fiscal-printer family | Additional 8–12 weeks |
| Combined field pilot, recovery/reconciliation fixes, deployment and operating runbooks | Additional 4–6 weeks |
| Sequential combined working range | 26–40 weeks, roughly 6–9 months |

Some verification happens throughout these stages; the last stage covers actual field evidence
and resulting fixes. With two experienced full-time engineers, a rough combined range is 4–6
months if work is split usefully, not half the calendar automatically. Part-time work extends the
calendar according to available hours. AI speeds implementation but does not remove real-device
testing, operator feedback or fiscal/invoice failure handling.

Assumptions: online authorization initially; one supported desktop OS/device family; cash/card
payments recorded, with bank-terminal/acquirer integration excluded unless separately selected;
no manufacturing or full accounting; no external POS adapters. Full offline multi-till selling,
several device families, deeper reporting or full accounting can push the broader product toward
9–12+ months. No fixed estimate for those extensions is accepted yet.

Revise the range after the first vertical receiving/sale slice and the UJP/printer proofs, using
observed throughput. Until then, technical unknowns and setup usability dominate confidence more
than typing speed. Inventory-only pilot readiness does not mean a retail store can replace its
checkout before the POS phase is complete.

**Historical research — external POS exploration, superseded as product scope**

Research date: 2026-09-05. Scope: fiscal equipment, checkout software, and whether OmniStock can
obtain sales and stop sales with insufficient stock. This is not a vendor compatibility certification.

**Finding:** there is a common fiscal framework, but the examined sources do not establish a
single mandatory POS application or universal inventory API. Choose and verify a specific software,
device model and firmware combination before promising an integration.

**What the primary sources establish**

| Source | Observed capability or rule | What it does not establish |
|---|---|---|
| [UJP fiscalization guide](https://www.ujp.gov.mk/e/vodic/category/133?print=1) | Describes approved fiscal equipment, electronic cash registers and fiscal printers; GPRS/cryptomodule transmission of daily financial reports; names several authorized producers | A common item-level stock API, remote pre-sale stock authorization, or one national checkout application |
| [David fiscal software](https://david.com.mk/c/9/rabota-so-fiskalni-aparati) | Computer connection, item/name/tax-group/price programming, turnover retrieval by item; software/support by Pixel Systems | Complete receipt/line/return export fidelity, public API availability, real-time timing or OmniStock interoperability |
| [David S specification](https://www.david.com.mk/p/9/fiskalna-kasa-david-s) | Lists fiscal-printer, online external-database, and autonomous operating modes | That all modes or installations can ask OmniStock to authorize each sale |
| [MojAccent Start user manual](https://moj.accent.mk/mojaccent/Upatstvo_za_korisnik.pdf), printed pages 12 and 21–22 | Documents application/item settings for negative stock and item selling-price entry | A supported integration API or external stock-authority hook |
| [Accent company description](https://www.accent.mk/about-us/?lang=en) | Describes its own integrated retail POS solutions | Market share, current API terms or compatibility with another provider |

These are first-party sources, not market-share evidence. Provider product pages/manuals can
describe older versions. Confirm the supported current product with the actual customer's vendor.
Do not infer that David and Accent share one protocol from their being subject to the same fiscal rules.

**Three separate systems**

1. **POS/checkout application:** selects items, quantities, prices, discounts and payment; this is
   where a stock check must happen before completing a new sale.
2. **Fiscal register/printer:** produces the fiscal receipt and keeps the required fiscal record.
   Device communication is model/version-specific until proven otherwise.
3. **OmniStock inventory:** owns receipt costs, lots, sellable stock, corrections and analytics.
   Its relationship to the POS must explicitly identify which system controls stock and price.

UJP's described daily-report channel should not be assumed to supply a third-party application
with live item/lot receipts. e-Faktura is a separate invoice integration and does not resolve POS
stock enforcement. A printer driver alone also does not provide a full checkout or POS sales API.

For context, a [Macedonian fiscal-driver repository](https://github.com/tinodj/mk-fiscal-printer-driver)
reports testing on named Synergy and Expert devices, but its author describes code originating in
2005 and intended for learning. It is a discovery lead, not a production dependency recommendation
or proof of current compatibility. No third-party driver was installed or executed in this review.

**The strict-stock requirement changes the integration contract**

| Connection | Can retain sales for analytics? | Can prevent a new sale exceeding OmniStock stock? |
|---|---|---|
| Receipt export/import or completed-sale push | Yes, if source coverage and fields are adequate | No; the sale already happened |
| Periodic product/stock synchronization | Potentially | Cannot guarantee it under stale data or concurrent tills |
| POS calls OmniStock before completion | Yes | Can, with atomic allocation/reservation and a tested failure protocol |
| OmniStock operates checkout and a supported fiscal device | Yes | Can control authorization, but adds checkout/device integration to scope |

This table is an architectural inference from when each integration participates in a sale. It is
not a claim that a named provider currently offers the required interface.

**Recommended next proof:** take the first customer's actual POS/software version and fiscal-device
model, and prove both receipt capture and pre-sale stock/price validation. Start with a single
supported integration. David/Pixel and Accent are concrete investigation candidates from the
sources above, not selected vendors. No provider has been contacted.

The proof must establish:

- Normal/discounted sale, partial return, void, and receipt-to-invoice examples; stable receipt and
  line IDs, device/location identity, business timestamps, VAT and original totals.
- Public/supported API, export or database integration terms; authentication, deployment/bridge
  requirements, operational ownership, version/firmware support, and licensing constraints.
- Whether the POS can ask before completion, honor a rejection, use the confirmed sale price, and
  atomically reserve/commit/release across simultaneous tills. A read-only check is insufficient.
- What happens when internet is down, payment succeeds but fiscal printing is uncertain, a response
  is lost, or a retry arrives. An uncertain completed sale must not release stock for a second buyer.
- Source totals reconciliation and recovery after a missed feed interval. Invalid/unmapped local
  data must not erase a valid completed fiscal event.

If the vendor cannot participate before sale, report that integration as receipt capture only.
Either select a compatible POS, explicitly relax the guarantee, or separately approve an OmniStock
checkout. The current plan still defers building checkout; the founder's selection remains pending.

**Related source discrepancy**

The blueprint previously asserted ten years of fiscal retention without a precise citation. UJP's
guide describes five years for the receipt control trail, and includes some older provisions.
These may refer to different records and obligations. Establish the current legal rule per record
type before finalizing retention; neither a blanket ten-year statement nor a blanket five-year
replacement is justified by this research alone.

**Remaining evidence gaps:** no live POS was inspected, no vendor SDK/current integration agreement
was obtained, no test receipt was sent to a real device, and no supported third-party pre-sale hook
was verified. The e-Faktura technical wiki remained inaccessible in the preceding review; this
research does not validate its detailed endpoint/signature assertions or current legal dates.
