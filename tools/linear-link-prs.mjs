#!/usr/bin/env node
/**
 * Backfills the merged GitHub pull requests onto their Linear issues:
 *   - copies the PR description into the issue description
 *   - attaches the PR to the issue as a real GitHub PR attachment (linkKind "closes")
 *
 * The existing PRs were merged from `codex/*` branches that predate Linear, so
 * they carry no issue identifier and the GitHub integration cannot match them
 * automatically. This maps them by hand, once.
 *
 * Reads PR data from `gh pr list --json number,title,body,url,headRefName,mergedAt`.
 * Idempotent: re-running refreshes descriptions and skips attachments that exist.
 *
 * Auth: LINEAR_API_KEY env var, or a personal API key in ~/.linear_api_key
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const API = 'https://api.linear.app/graphql';
const REPO = 'https://github.com/HyRALis/warehouse';

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
    if (body.errors) throw new Error(JSON.stringify(body.errors, null, 2));
    return body.data;
}

/** GitHub PR number -> the Linear issue title it was seeded as. */
const PR_TO_ISSUE = {
    1: 'Stage 00 — Define vendor portal execution roadmap',
    2: 'Stage 01 — Vendor taxonomy, product versions, and search foundation',
    3: 'Stage 02 — Seed system categories and product templates',
    4: 'Stage 03 — Quick-create menu and searchable categories',
    5: 'Stage 04 — Simplify creation and preserve lifecycle states',
    6: 'Stage 05 — Sellable product version workflows',
    7: 'Stage 06 — Tenant-scoped universal search API',
    8: 'Stage 07 — Universal search palette and results page',
    9: 'Stage 08 — Streamline category and template management',
    10: 'Stage 09 — Category codes and product versions in CSV',
    11: 'PR 00 — Final Prisma and identity completion roadmap',
    12: 'PR 01 — Upgrade vendor platform to Prisma 7',
    13: 'PR 02 — Better Auth users, organizations, and secure sessions',
    14: 'PR 03 — Portal subscriptions and vendor-profile tenancy'
};

function fetchPRs() {
    const out = execFileSync(
        'gh',
        ['pr', 'list', '--state', 'merged', '--limit', '50', '--json', 'number,title,body,url,headRefName,mergedAt'],
        { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }
    );
    return JSON.parse(out);
}

function buildDescription(pr) {
    const merged = pr.mergedAt ? pr.mergedAt.slice(0, 10) : 'unknown';
    const header = [
        `**Pull request:** [#${pr.number} — ${pr.title}](${pr.url})`,
        `**Branch:** \`${pr.headRefName}\``,
        `**Merged:** ${merged} into \`develop\``,
        '',
        '---',
        ''
    ].join('\n');
    return header + (pr.body || '_No pull request description._').trim() + '\n';
}

async function main() {
    const prs = fetchPRs();
    const byNumber = new Map(prs.map((p) => [p.number, p]));
    console.log(`fetched ${prs.length} merged pull requests\n`);

    const { team } = await gql(
        `query { team(id: "265a2d04-0e3f-4314-b90e-4d434c823a37") {
       issues(first: 250) { nodes { id identifier title attachments { nodes { id url } } } } } }`
    );
    const byTitle = new Map(team.issues.nodes.map((i) => [i.title, i]));

    let described = 0;
    let attached = 0;

    for (const [num, title] of Object.entries(PR_TO_ISSUE)) {
        const pr = byNumber.get(Number(num));
        const issue = byTitle.get(title);

        if (!pr) {
            console.log(`  PR #${num}: not found on GitHub — skipped`);
            continue;
        }
        if (!issue) {
            console.log(`  PR #${num}: no Linear issue titled "${title}" — skipped`);
            continue;
        }

        await gql(
            `mutation ($id: String!, $input: IssueUpdateInput!) { issueUpdate(id: $id, input: $input) { success } }`,
            { id: issue.id, input: { description: buildDescription(pr) } }
        );
        described += 1;

        const already = issue.attachments.nodes.some((a) => a.url === pr.url);
        if (already) {
            console.log(`  ${issue.identifier} ← PR #${num}  description updated, attachment already present`);
            continue;
        }

        await gql(
            `mutation ($issueId: String!, $url: String!, $title: String!) {
         attachmentLinkGitHubPR(issueId: $issueId, url: $url, title: $title, linkKind: closes) {
           success attachment { id }
         } }`,
            { issueId: issue.id, url: pr.url, title: `#${pr.number} ${pr.title}` }
        );
        attached += 1;
        console.log(`  ${issue.identifier} ← PR #${num}  description updated, PR attached`);
    }

    console.log(`\n${described} descriptions written, ${attached} pull requests attached.`);
}

main().catch((err) => {
    console.error(err.message);
    process.exit(1);
});
