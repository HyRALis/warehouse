#!/usr/bin/env node
/**
 * Seeds the OmniStock Linear workspace: one team, custom workflow statuses,
 * an Area label group, six projects, and the issue backlog derived from
 * docs/vendor-portal-implementation-plan.md, docs/inventory-portal-architecture.md,
 * and the merged pull requests on HyRALis/warehouse.
 *
 * Idempotent: every entity is looked up by name before it is created, so
 * re-running only fills in what is missing.
 *
 * Auth: LINEAR_API_KEY env var, or a personal API key in ~/.linear_api_key
 */

import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const API = 'https://api.linear.app/graphql';

function apiKey() {
    if (process.env.LINEAR_API_KEY) return process.env.LINEAR_API_KEY.trim();
    try {
        return readFileSync(join(homedir(), '.linear_api_key'), 'utf8').trim();
    } catch {
        console.error('No API key. Set LINEAR_API_KEY or write the key to ~/.linear_api_key');
        process.exit(1);
    }
}

const KEY = apiKey();

async function gql(query, variables = {}) {
    const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: KEY },
        body: JSON.stringify({ query, variables })
    });
    const body = await res.json();
    if (body.errors) {
        throw new Error(JSON.stringify(body.errors, null, 2));
    }
    return body.data;
}

const TEAM_NAME = 'OmniStock';
const TEAM_KEY = 'OMN';

/** name -> Linear status type. Order here is the order shown in the board. */
const STATUSES = [
    ['Research phase', 'backlog', '#95a2b3'],
    ['Planning phase', 'unstarted', '#e2e2e2'],
    ['On hold', 'backlog', '#bec2c8'],
    ['In progress', 'started', '#f2c94c'],
    ['Testing', 'started', '#f2994a'],
    ['Reviewing', 'started', '#5e6ad2'],
    ['On develop', 'started', '#26b5ce'],
    ['On staging', 'started', '#0f7488'],
    ['Finished', 'completed', '#5e9c76']
];

const AREA_LABELS = [
    ['Front end', '#4ea7fc'],
    ['Back end', '#bb87fc'],
    ['Research', '#f2c94c']
];

const PROJECTS = [
    ['Vendor Portal', 'Product-first vendor catalog portal. Spec: docs/vendor-portal-implementation-plan.md'],
    ['Inventory Portal', 'Append-only stock ledger and purchasing analytics. Spec: docs/inventory-portal-architecture.md'],
    ['Cashier Portal', 'Point-of-sale application. Deferred out of the Inventory Portal scope.'],
    ['Supplier Portal', 'Supplier-facing portal. Scope not yet defined.'],
    ['Marketing', 'Positioning, public site, and launch content.'],
    ['Sales & Business Plan Analysis', 'Market, competition, pricing, and plan definition.']
];

const REPO = 'https://github.com/HyRALis/warehouse';

/** [title, project, status, area, description, priority] */
const ISSUES = [
    // ---- Vendor Portal: merged, already implemented ----
    ['Stage 00 — Define vendor portal execution roadmap', 'Vendor Portal', 'Finished', 'Research', `Merged in ${REPO}/pull/1 (\`codex/vendor-00-roadmap-contracts\`).`],
    ['Stage 01 — Vendor taxonomy, product versions, and search foundation', 'Vendor Portal', 'Finished', 'Back end', `Merged in ${REPO}/pull/2 (\`codex/vendor-01-data-foundation\`).`],
    ['Stage 02 — Seed system categories and product templates', 'Vendor Portal', 'Finished', 'Back end', `126-category taxonomy and 12 system characteristic templates. Merged in ${REPO}/pull/3.`],
    ['Stage 03 — Quick-create menu and searchable categories', 'Vendor Portal', 'Finished', 'Front end', `Merged in ${REPO}/pull/4 (\`codex/vendor-03-quick-create-category-ui\`).`],
    ['Stage 04 — Simplify creation and preserve lifecycle states', 'Vendor Portal', 'Finished', 'Front end', `Merged in ${REPO}/pull/5 (\`codex/vendor-04-product-editor-status\`).`],
    ['Stage 05 — Sellable product version workflows', 'Vendor Portal', 'Finished', 'Back end', `Merged in ${REPO}/pull/6 (\`codex/vendor-05-product-versions\`).`],
    ['Stage 06 — Tenant-scoped universal search API', 'Vendor Portal', 'Finished', 'Back end', `Merged in ${REPO}/pull/7. Verification: docs/verification/vendor-06-universal-search.md`],
    ['Stage 07 — Universal search palette and results page', 'Vendor Portal', 'Finished', 'Front end', `Merged in ${REPO}/pull/8 (\`codex/vendor-07-universal-search-ui\`).`],
    ['Stage 08 — Streamline category and template management', 'Vendor Portal', 'Finished', 'Front end', `Merged in ${REPO}/pull/9. Verification: docs/vendor-08-category-template-management-verification.md`],
    ['Stage 09 — Category codes and product versions in CSV', 'Vendor Portal', 'Finished', 'Back end', `Merged in ${REPO}/pull/10. Verification: docs/vendor-09-csv-version-compatibility.md`],
    ['PR 00 — Final Prisma and identity completion roadmap', 'Vendor Portal', 'Finished', 'Research', `Merged in ${REPO}/pull/11 (\`codex/docs-vendor-completion-roadmap\`).`],
    ['PR 01 — Upgrade vendor platform to Prisma 7', 'Vendor Portal', 'Finished', 'Back end', `Merged in ${REPO}/pull/12. Notes: docs/prisma-7-upgrade.md`],
    ['PR 02 — Better Auth users, organizations, and secure sessions', 'Vendor Portal', 'Finished', 'Back end', `Merged in ${REPO}/pull/13. Notes: docs/better-auth-migration.md`],
    ['PR 03 — Portal subscriptions and vendor-profile tenancy', 'Vendor Portal', 'Finished', 'Back end', `Merged in ${REPO}/pull/14. Notes: docs/vendor-entitlements-migration.md`],

    // ---- Vendor Portal: needs review ----
    ['Review and approve the Inventory Portal architecture blueprint', 'Vendor Portal', 'Reviewing', 'Research', 'docs/inventory-portal-architecture.md is marked "Proposed; awaiting approval before PR 00". Approval gates the whole Inventory Portal roadmap.'],
    ['Commit the untracked inventory portal docs to git', 'Vendor Portal', 'Reviewing', 'Research', 'docs/inventory-portal-architecture.md and docs/inventory-portal-decision-log.md are untracked on `develop`.'],
    ['Decide the fate of the incomplete Stage 10 worktree', 'Vendor Portal', 'Reviewing', 'Research', 'Plan §4: the unfinished Stage 10 worktree is preserved as evidence but not treated as completed release work.'],
    ["Evaluate main's frontend work for reconciliation onto develop", 'Vendor Portal', 'Reviewing', 'Front end', 'Plan §4: work from `main` is intentionally excluded and may be evaluated separately after the Vendor Portal release. Architecture §10.1 depends on this reconciliation.'],

    // ---- Vendor Portal: planned, stages 04-12 ----
    ['PR 04 — Migrate vendor authentication and organization onboarding', 'Vendor Portal', 'Planning phase', 'Front end', 'Branch `codex/frontend-vendor-auth`. Registration, login, verification, reset, MFA, sessions, and active Organization context.'],
    ['PR 05 — Member invitations and vendor portal access', 'Vendor Portal', 'Planning phase', 'Front end', 'Branch `codex/frontend-vendor-member-access`. Owner invites members and controls access; no inventory roles yet.'],
    ['PR 06 — Harden catalog tenancy and product lifecycle APIs', 'Vendor Portal', 'Planning phase', 'Back end', 'Branch `codex/backend-vendor-catalog-hardening`. Profile-scoped authorization, system-record immutability, identifier uniqueness, primary-version concurrency.'],
    ['PR 07 — Harden R2 media, imports, exports, and search', 'Vendor Portal', 'Planning phase', 'Back end', 'Branch `codex/backend-vendor-media-import-search`. Includes the 10,000-product search benchmark.'],
    ['PR 08 — Remove transitional vendor authentication fields', 'Vendor Portal', 'Planning phase', 'Back end', 'Branch `codex/backend-vendor-auth-cleanup`. Only after the frontend cutover and migration audits pass.'],
    ['PR 09 — Harden product and version workflows', 'Vendor Portal', 'Planning phase', 'Front end', 'Branch `codex/frontend-vendor-product-hardening`.'],
    ['PR 10 — Harden catalog, search, and import workflows', 'Vendor Portal', 'Planning phase', 'Front end', 'Branch `codex/frontend-vendor-catalog-search-hardening`.'],
    ['PR 11 — Complete accessibility and responsive behavior', 'Vendor Portal', 'Planning phase', 'Front end', 'Branch `codex/frontend-vendor-accessibility`. Keyboard, screen reader, desktop, and mobile.'],
    ['PR 12 — Verify and document vendor portal release', 'Vendor Portal', 'Planning phase', 'Research', 'Branch `codex/release-vendor-portal`. Release evidence and documentation only, no business features.'],

    // ---- Inventory Portal: roadmap §15 ----
    ['00 — Architecture, decision log, and handoff docs', 'Inventory Portal', 'Planning phase', 'Research', 'Branch `codex/inventory-00-architecture`.'],
    ['01 — Platform frontend reconciliation', 'Inventory Portal', 'Planning phase', 'Front end', "Branch `codex/platform-frontend-reconciliation`. Port main's contracts package, TanStack Query/Form, Radix, Storybook, MSW onto develop; revise VPD-009."],
    ['02 — Inventory entitlement, roles, and app shell', 'Inventory Portal', 'Planning phase', 'Back end', 'Branch `codex/inventory-01-entitlement`. Seed the `inventory` Portal row, subscription and access middleware, roles, /context.'],
    ['03 — Stock locations and suppliers', 'Inventory Portal', 'Planning phase', 'Back end', 'Branch `codex/inventory-02-locations-suppliers`.'],
    ['04 — Inventory items with catalog/external invariant', 'Inventory Portal', 'Planning phase', 'Back end', 'Branch `codex/inventory-03-items`. Trigram search and catalog sync.'],
    ['05 — Stock movement ledger and domain package', 'Inventory Portal', 'Planning phase', 'Back end', 'Branch `codex/inventory-04-ledger`. packages/inventory-domain, StockMovement, StockLot, StockBalance, projection, concurrency and integrity tests.'],
    ['06 — Receiving, purchase cost, and landed-cost allocation', 'Inventory Portal', 'Planning phase', 'Back end', 'Branch `codex/inventory-05-receiving`. Includes per-delivery expiry.'],
    ['07 — Effective-dated pricing and VAT', 'Inventory Portal', 'Planning phase', 'Back end', 'Branch `codex/inventory-06-pricing-vat`.'],
    ['08 — Manual sales, FEFO/FIFO allocation, and COGS capture', 'Inventory Portal', 'Planning phase', 'Back end', 'Branch `codex/inventory-07-sales-manual`. Void as compensation, never edit.'],
    ['09 — POS ingest endpoint and reconciliation queue', 'Inventory Portal', 'Planning phase', 'Back end', 'Branch `codex/inventory-08-pos-ingest`. Idempotent ingest, external systems, item mapping.'],
    ['10 — Stock counts and inter-location transfers', 'Inventory Portal', 'Planning phase', 'Back end', 'Branch `codex/inventory-09-counts-transfers`.'],
    ['11 — Daily and monthly rollups with refresh worker', 'Inventory Portal', 'Planning phase', 'Back end', 'Branch `codex/inventory-10-rollups`. Watermarked refresh, rebuild command, golden-dataset test.'],
    ['12 — Analytics query API', 'Inventory Portal', 'Planning phase', 'Back end', 'Branch `codex/inventory-11-analytics-api`. Seasonality and reorder suggestions.'],
    ['13 — Financials API', 'Inventory Portal', 'Planning phase', 'Back end', 'Branch `codex/inventory-12-financials-api`. Month, quarter, and year gross profit; CSV export.'],
    ['14 — Table and chart UI primitives', 'Inventory Portal', 'Planning phase', 'Front end', 'Branch `codex/inventory-13-ui-primitives`. DataTable, FilterBar, chart organisms, palette tokens, Storybook coverage.'],
    ['15 — Stock, lot, and expiry UI', 'Inventory Portal', 'Planning phase', 'Front end', 'Branch `codex/inventory-14-ui-stock`. Includes counts and adjustments.'],
    ['16 — Receiving and manual sales UI', 'Inventory Portal', 'Planning phase', 'Front end', 'Branch `codex/inventory-15-ui-receiving-sales`. Includes the reconciliation queue.'],
    ['17 — Analytics dashboard', 'Inventory Portal', 'Planning phase', 'Front end', 'Branch `codex/inventory-16-ui-analytics`.'],
    ['18 — Financial period views and export', 'Inventory Portal', 'Planning phase', 'Front end', 'Branch `codex/inventory-17-ui-financials`.'],
    ['19 — Low stock, expiry, and reorder alerting', 'Inventory Portal', 'Planning phase', 'Back end', 'Branch `codex/inventory-18-alerts`.'],
    ['20 — Accessibility, performance, and release hardening', 'Inventory Portal', 'Planning phase', 'Back end', 'Branch `codex/inventory-19-hardening`. Adversarial tenancy tests and release evidence.'],

    // ---- Inventory Portal: open questions §14 ----
    ['Decide e-Faktura scope before the 1 October 2026 obligation', 'Inventory Portal', 'Research phase', 'Research', 'Architecture §14 Q4. The B2G obligation starts 1 October 2026 and extends to all VAT payers through 2027. The model is kept compatible but submission is not implemented. Needs a product-owner decision and probably its own roadmap slot.', 1],
    ['Currency: MKD only, or multi-currency?', 'Inventory Portal', 'Research phase', 'Research', 'Architecture §14 Q1. Multi-currency means FX rates, a reporting currency, and rate-dated conversion in every financial figure. Blocks the financials PR. Assumption until answered: MKD only.', 2],
    ['Confirm per-location timezone assumption', 'Inventory Portal', 'Research phase', 'Research', 'Architecture §14 Q2. Assumed Europe/Skopje per location. Blocks the rollup PR.', 3],
    ['Choose the POS systems to support', 'Inventory Portal', 'Research phase', 'Research', 'Architecture §14 Q3. The ingest contract can be designed now; a concrete adapter needs a named vendor and its API docs. Blocks the POS adapter, not the ingest endpoint.', 2],
    ['Establish expected scale: SKUs, locations, transactions per day', 'Inventory Portal', 'Research phase', 'Research', 'Architecture §14 Q5. Sets the TimescaleDB escalation trigger and the performance benchmark size.', 3],
    ['Determine historical data backfill availability and format', 'Inventory Portal', 'Research phase', 'Research', 'Architecture §14 Q6. Year-over-year analytics needs a previous year of data. Blocks the analytics UI being useful at launch.', 3],
    ['Confirm whether an inventory org is always also a vendor org', 'Inventory Portal', 'Research phase', 'Research', 'Architecture §14 Q7. If customers can buy only the Inventory Portal, registration must create an organization with no VendorProfile.', 3],

    // ---- Cashier Portal ----
    ['Macedonian POS integration', 'Cashier Portal', 'Research phase', 'Back end', 'Integrate with Macedonian point-of-sale systems. Consumes the SalesIngestPayload contract from architecture §6.3; each POS gets a thin adapter.'],
    ['Hardware fiscalization and UJP Z-report transmission', 'Cashier Portal', 'Research phase', 'Back end', 'North Macedonia runs a hardware-based fiscalization regime with certified devices. Explicitly deferred out of the Inventory Portal (architecture §3, §7) — the portal records fiscal facts but does not produce them.'],

    // ---- Supplier Portal ----
    ['Define Supplier Portal scope and architecture', 'Supplier Portal', 'Research phase', 'Research', 'No source material exists in the repo yet. Produce a blueprint in the style of the vendor and inventory portal docs.'],

    // ---- Marketing ----
    ['Define positioning and messaging for OmniStock', 'Marketing', 'Research phase', 'Research', 'Placeholder — not derived from repo documentation.'],
    ['Plan the public site and landing pages', 'Marketing', 'Research phase', 'Research', 'Placeholder — not derived from repo documentation.'],
    ['Launch content plan for the Vendor Portal release', 'Marketing', 'Research phase', 'Research', 'Placeholder — not derived from repo documentation.'],

    // ---- Sales & Business Plan Analysis ----
    ['Competition research', 'Sales & Business Plan Analysis', 'Research phase', 'Research', 'Identify competing inventory and vendor catalog products in the North Macedonia and wider regional market.'],
    ['Market research', 'Sales & Business Plan Analysis', 'Research phase', 'Research', 'Size and segment the target market: store managers, warehouse managers, and owners who plan purchasing.'],
    ['Pricing definition', 'Sales & Business Plan Analysis', 'Research phase', 'Research', 'Define pricing per portal subscription, informed by competition and market research.'],
    ['Plans definition', 'Sales & Business Plan Analysis', 'Research phase', 'Research', 'Define subscription tiers and what each portal entitlement includes.']
];

async function ensureTeam() {
    const { teams } = await gql(`query { teams(first: 100) { nodes { id name key } } }`);
    const found = teams.nodes.find((t) => t.key === TEAM_KEY || t.name === TEAM_NAME);
    if (found) {
        console.log(`team: ${found.name} (${found.key}) exists`);
        return found.id;
    }
    const data = await gql(
        `mutation ($input: TeamCreateInput!) { teamCreate(input: $input) { success team { id name key } } }`,
        { input: { name: TEAM_NAME, key: TEAM_KEY } }
    );
    console.log(`team: created ${TEAM_NAME} (${TEAM_KEY})`);
    return data.teamCreate.team.id;
}

async function ensureStatuses(teamId) {
    const { team } = await gql(
        `query ($id: String!) { team(id: $id) { states(first: 100) { nodes { id name type position } } } }`,
        { id: teamId }
    );
    // Linear rejects a create when name+type collide case-insensitively with an
    // auto-created default ("In progress" vs its "In Progress"), so reuse those
    // in place rather than creating alongside them.
    const byLowerName = new Map(team.states.nodes.map((s) => [s.name.toLowerCase(), s]));
    const byName = {};
    const reused = new Set();

    for (const [i, [name, type, color]] of STATUSES.entries()) {
        const hit = byLowerName.get(name.toLowerCase());
        if (hit) {
            byName[name] = hit.id;
            reused.add(hit.id);
            if (hit.name !== name || hit.type !== type) {
                await gql(
                    `mutation ($id: String!, $input: WorkflowStateUpdateInput!) { workflowStateUpdate(id: $id, input: $input) { success } }`,
                    { id: hit.id, input: { name, position: i } }
                );
                console.log(`  status: adopted default "${hit.name}" as ${name}`);
            } else {
                console.log(`  status: ${name} exists`);
            }
            continue;
        }
        const data = await gql(
            `mutation ($input: WorkflowStateCreateInput!) { workflowStateCreate(input: $input) { success workflowState { id name } } }`,
            { input: { teamId, name, type, color, position: i } }
        );
        byName[name] = data.workflowStateCreate.workflowState.id;
        console.log(`  status: created ${name} (${type})`);
    }

    // Archive Linear's leftover defaults (there is no delete mutation for states).
    // Canceled and Duplicate are kept: Linear needs a state of each of those types
    // and dropped work needs somewhere to go.
    const keepTypes = new Set(['canceled', 'duplicate']);
    for (const s of team.states.nodes) {
        if (reused.has(s.id) || keepTypes.has(s.type)) continue;
        try {
            await gql(`mutation ($id: String!) { workflowStateArchive(id: $id) { success } }`, { id: s.id });
            console.log(`  status: archived default "${s.name}"`);
        } catch (err) {
            console.log(`  status: could not archive "${s.name}" — ${err.message.split('\n')[0]}`);
        }
    }
    return byName;
}

async function ensureLabels(teamId) {
    const { team } = await gql(
        `query ($id: String!) { team(id: $id) { labels(first: 100) { nodes { id name isGroup parent { id name } } } } }`,
        { id: teamId }
    );
    const existing = new Map(team.labels.nodes.map((l) => [l.name, l]));

    // The parent must be created with isGroup, otherwise children are rejected
    // with "Cannot add a label to a non-group parent".
    const area = existing.get('Area');
    let groupId = area?.id;
    if (!groupId) {
        const data = await gql(
            `mutation ($input: IssueLabelCreateInput!) { issueLabelCreate(input: $input) { success issueLabel { id } } }`,
            { input: { teamId, name: 'Area', color: '#6b7280', isGroup: true } }
        );
        groupId = data.issueLabelCreate.issueLabel.id;
        console.log('  label group: created Area');
    } else if (!area.isGroup) {
        await gql(
            `mutation ($id: String!, $input: IssueLabelUpdateInput!) { issueLabelUpdate(id: $id, input: $input) { success } }`,
            { id: groupId, input: { isGroup: true } }
        );
        console.log('  label group: promoted Area to a group');
    } else {
        console.log('  label group: Area exists');
    }

    const byName = {};
    for (const [name, color] of AREA_LABELS) {
        if (existing.has(name)) {
            byName[name] = existing.get(name).id;
            console.log(`  label: ${name} exists`);
            continue;
        }
        const data = await gql(
            `mutation ($input: IssueLabelCreateInput!) { issueLabelCreate(input: $input) { success issueLabel { id } } }`,
            { input: { teamId, name, color, parentId: groupId } }
        );
        byName[name] = data.issueLabelCreate.issueLabel.id;
        console.log(`  label: created ${name}`);
    }
    return byName;
}

async function ensureProjects(teamId) {
    const { projects } = await gql(`query { projects(first: 100) { nodes { id name } } }`);
    const existing = new Map(projects.nodes.map((p) => [p.name, p.id]));
    const byName = {};

    for (const [name, description] of PROJECTS) {
        if (existing.has(name)) {
            byName[name] = existing.get(name);
            console.log(`  project: ${name} exists`);
            continue;
        }
        const data = await gql(
            `mutation ($input: ProjectCreateInput!) { projectCreate(input: $input) { success project { id name } } }`,
            { input: { name, description, teamIds: [teamId] } }
        );
        byName[name] = data.projectCreate.project.id;
        console.log(`  project: created ${name}`);
    }
    return byName;
}

async function ensureIssues(teamId, statuses, labels, projects) {
    const { team } = await gql(
        `query ($id: String!) { team(id: $id) { issues(first: 250) { nodes { id title } } } }`,
        { id: teamId }
    );
    const existing = new Set(team.issues.nodes.map((i) => i.title));

    let created = 0;
    for (const [title, project, status, area, description, priority] of ISSUES) {
        if (existing.has(title)) {
            console.log(`  issue: "${title}" exists`);
            continue;
        }
        const input = {
            teamId,
            title,
            description,
            projectId: projects[project],
            stateId: statuses[status],
            labelIds: [labels[area]]
        };
        if (priority) input.priority = priority;

        await gql(
            `mutation ($input: IssueCreateInput!) { issueCreate(input: $input) { success issue { identifier } } }`,
            { input }
        );
        created += 1;
        console.log(`  issue: created "${title}"`);
    }
    console.log(`\n${created} issues created, ${ISSUES.length - created} already present.`);
}

async function main() {
    const { viewer } = await gql(`query { viewer { id name email } }`);
    console.log(`authenticated as ${viewer.name} <${viewer.email}>\n`);

    const teamId = await ensureTeam();

    console.log('\nstatuses:');
    const statuses = await ensureStatuses(teamId);

    console.log('\nlabels:');
    const labels = await ensureLabels(teamId);

    console.log('\nprojects:');
    const projects = await ensureProjects(teamId);

    console.log('\nissues:');
    await ensureIssues(teamId, statuses, labels, projects);
}

main().catch((err) => {
    console.error(err.message);
    process.exit(1);
});
