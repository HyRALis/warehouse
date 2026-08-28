# Vendor 06 Universal Search Verification

## Endpoint contract

`GET /api/v1/search` requires an authenticated vendor session.

| Parameter | Contract |
| --- | --- |
| `q` | Required, trimmed, 1–100 characters |
| `mode` | `suggestions` (default) or `results` |
| `types` | Optional comma-separated `product`, `version`, `category`, `template` filter |
| `page` | 1–100; used by results mode |
| `limit` | 1–50; suggestions mode is capped at 20 and five results per group |

Results share a stable shape with a type, title, subtitle, deep link, numeric relevance score,
matched field, and entity-specific context. The response includes grouped data for the command
palette and flat, globally ranked data with pagination for the full results page.

## Ranking and matching

1. Exact barcode and SKU matches.
2. Exact category code, template key, product name, or version label.
3. Exact category alias.
4. Identifier and name prefixes.
5. Case-insensitive contains and PostgreSQL trigram similarity matches.

Product-version results include their parent product context. Category results include a
breadcrumb and aliases participate in matching. Template JSON field names participate in
matching. Stable title and ID tie-breakers make pagination deterministic.

## Security and limits

- Products and versions are constrained to the authenticated `vendor_id` inside SQL.
- Soft-deleted products and versions are excluded.
- Categories and templates admit only system records or records owned by the authenticated vendor.
- SQL values are passed through Prisma tagged-template parameters; query input is not interpolated
  into SQL text.
- Search has a dedicated 60 requests/minute limiter in addition to the general API limiter.

## Local PostgreSQL verification (2026-08-28)

The verification fixture used two vendors, an owned product with a primary version, a vendor
category alias, a vendor template field, and exact identifiers belonging to the second vendor.
All fixture IDs were removed after the run.

- Exact version barcode: one result, `version`, matched field `barcode`.
- Exact product SKU: product ranked first with version context also returned.
- Category alias `capsule goods`: vendor category returned with `alias` as the matched field.
- Template field `fabric weight`: vendor template returned with `field name` as the match.
- Cross-tenant exact product/barcode query: neither the other vendor's product nor version ID was
  returned.
- Grouped `stage06` suggestions: product, version, category, and template groups all returned.
- Twenty warm searches: 2.24 ms average, 3.73 ms maximum on the local development dataset.

The data-foundation migration supplies GIN trigram indexes on all four `search_text` columns.
Release hardening will repeat query-plan and response-time checks against the planned 10,000+
product benchmark corpus.
