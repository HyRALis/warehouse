# Vendor API dependency security correction

## Summary and motivation

The production audit on 2026-09-06 reported three moderate findings in the Express/body-parser
dependency chain, all originating in `qs` 6.15.3. Both the
[bracketed comma-array limit bypass](https://github.com/advisories/GHSA-x5fp-wj9c-mxmx) and the
[constructor-like input serialization failure](https://github.com/advisories/GHSA-4mjr-xmp4-gh2g)
are patched in `qs` 6.16.0. This PR adopts that parser without upgrading Express or changing routes.

## Why this implementation

Express 4.22.2 and body-parser 1.20.6 currently request `qs ~6.15.1`, so normal dependency updates
do not select the patched minor release. The root override pins `qs` to 6.16.0. The API declares
the same version as a development dependency for explicit parser regression tests.

The previous npm 11.6.2 silently ignored the override through the API workspace link. This matches
[npm's reported workspace override bug](https://github.com/npm/cli/issues/9659). Resolving with npm
11.18.0 applies the override correctly. The repository package-manager pin, npm engine range and CI
installation now agree on npm 11.18.0; no global installation was changed during local verification.
The Node minimum is 22.9, compatible with that npm release and the existing Node 22 CI setup.

The only installed dependency version changed in the lockfile is `qs`, from 6.15.3 to 6.16.0.
The remaining lockfile changes are npm peer-metadata normalization and removal of the obsolete
shared-types workspace entry. This is not a general framework or dependency upgrade.

## Scope and behavior

- Backend dependency/tooling, parser regression tests and setup documentation only; no frontend UI.
- No public endpoint, request/response contract, authorization rule or database migration changes.
- Ordinary filter, pagination and repeated-identifier parsing remains covered.
- Regression checks resolve the parser from both Express and body-parser themselves and assert
  they share the patched module. Merely installing a patched test-only copy is not accepted.
- Small synthetic inputs exercise the two upstream failure conditions without generating large
  payloads or contacting a running application.

## Verification

Use the pinned npm release for dependency operations:

```sh
npx --yes npm@11.18.0 ci --ignore-scripts
npx --yes npm@11.18.0 run build
npx --yes npm@11.18.0 test
npx --yes npm@11.18.0 run lint
npx --yes npm@11.18.0 run standards:check
npx --yes npm@11.18.0 audit --omit=dev --audit-level=moderate
```

The local clean-install check suppresses dependency lifecycle scripts, then explicitly builds and
generates the project. CI retains its normal clean-install workflow with the same pinned npm version.
Results on 2026-09-06:

- Clean installation passed with npm 11.18.0.
- Full workspace and Storybook builds passed.
- 87 API tests, 74 tests on this backend branch's frontend baseline, and the compiled-contract
  check passed. The later frontend PR #22 independently passed its expanded 119-test suite.
- All 11 PostgreSQL migration/review tests passed when explicitly enabled against disposable local
  databases. The default test command intentionally skips those integration tests.
- Lint and standards passed. Three pre-existing image warnings remain on the backend baseline;
  their corrections are already in the separate frontend PR #22.
- The installed Express/body-parser parser resolves to 6.16.0; the production audit reports zero
  vulnerabilities, including at the moderate severity threshold.

## Dependencies and rollback

Branch: `codex/backend-vendor-dependency-security`; target: `develop`; dependency: PR #23.
Merge after its backend dependency. No automatic merge is enabled. Frontend PRs remain separate.

No data rollback is needed. Reverting the manifest, lockfile and tooling pin would restore the known
dependency findings, so a corrective forward patch is preferred. Remove the override only after
upstream Express/body-parser ranges include a patched parser and the regression checks still pass.

## Deferred work

The identity-settings, organization-switching, media-deletion and final release gates in
[the review checkpoint](vendor-review-2026-09-06.md) remain open. A clean dependency audit is not a
claim that the application has no security or business-logic defects.
