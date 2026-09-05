#!/usr/bin/env node
/**
 * Structural checks for docs/standards.
 *
 * These are the rules that can be verified by looking at file layout and imports, which ESLint
 * cannot express across workspace boundaries. Everything already covered by ESLint, TypeScript, or
 * Prettier is deliberately not repeated here.
 *
 * Violations that predate the standards live in tools/standards-baseline.json. They are
 * grandfathered so that existing debt cannot grow: the check fails on any violation that is not
 * already baselined, and reports baselined entries that have been fixed so they can be removed.
 *
 *   node tools/check-standards.mjs                    verify
 *   node tools/check-standards.mjs --update-baseline  re-record current violations (needs a reason
 *                                                     in the PR description)
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname, basename, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const baselinePath = join(repoRoot, 'tools', 'standards-baseline.json');

const IGNORED_DIRECTORIES = new Set([
    'node_modules',
    '.git',
    '.next',
    '.turbo',
    'dist',
    'build',
    'out',
    'coverage',
    'storybook-static',
    'generated',
    'migrations',
]);

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.mts', '.cts']);

/** Maximum line counts. Beyond these a file is doing more than one job. */
const LIMITS = {
    controller: 150,
    component: 200,
    route: 60,
};

const walk = (directory, files = []) => {
    if (!existsSync(directory)) return files;
    for (const entry of readdirSync(directory)) {
        if (IGNORED_DIRECTORIES.has(entry)) continue;
        const absolute = join(directory, entry);
        if (statSync(absolute).isDirectory()) {
            walk(absolute, files);
            continue;
        }
        if (SOURCE_EXTENSIONS.has(extname(entry))) files.push(absolute);
    }
    return files;
};

const toPosix = (absolute) => relative(repoRoot, absolute).split(sep).join('/');

const importPattern =
    /(?:import|export)[\s\S]*?from\s+['"]([^'"]+)['"]|require\(\s*['"]([^'"]+)['"]\s*\)|import\(\s*['"]([^'"]+)['"]\s*\)/g;

const readSource = (absolute) => {
    const text = readFileSync(absolute, 'utf8');
    const imports = [];
    for (const match of text.matchAll(importPattern)) {
        imports.push(match[1] ?? match[2] ?? match[3]);
    }
    return { text, imports, lineCount: text.split('\n').length };
};

const isTestFile = (path) => /\.test\.[cm]?tsx?$/.test(path);
const isStoryFile = (path) => /\.stories\.[cm]?tsx?$/.test(path);
const hasSibling = (absolute, suffix) => {
    const base = basename(absolute, extname(absolute));
    return ['.ts', '.tsx'].some((extension) =>
        existsSync(join(dirname(absolute), `${base}${suffix}${extension}`))
    );
};

const violations = [];
const report = (rule, target, detail) => violations.push({ rule, target, detail });

// ---------------------------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------------------------

const portalNames = existsSync(join(repoRoot, 'apps'))
    ? readdirSync(join(repoRoot, 'apps')).filter((entry) =>
          statSync(join(repoRoot, 'apps', entry)).isDirectory()
      )
    : [];

/** README §3 — portals never import each other. */
const checkCrossPortalImports = (path, { imports }) => {
    const match = /^apps\/([^/]+)\//.exec(path);
    if (!match) return;
    const own = match[1];
    for (const specifier of imports) {
        const other = portalNames.find(
            (name) => name !== own && new RegExp(`(^|/)apps/${name}/`).test(specifier)
        );
        if (other) report('cross-portal-import', path, `imports apps/${other} via "${specifier}"`);
    }
};

/** README §3 — packages/ui knows about pixels, not products. */
const forbiddenInUi = [
    'next',
    '@inventory-system/contracts',
    '@inventory-system/database',
    '@tanstack/',
    'nuqs',
    'zustand',
];
const checkUiPurity = (path, { imports }) => {
    if (!path.startsWith('packages/ui/src/')) return;
    for (const specifier of imports) {
        const forbidden = forbiddenInUi.find(
            (prefix) => specifier === prefix || specifier.startsWith(prefix)
        );
        if (forbidden) report('ui-package-purity', path, `imports "${specifier}"`);
    }
};

/** README §3 — contracts depend on zod and nothing else. */
const checkContractsPurity = (path, { imports }) => {
    if (!path.startsWith('packages/contracts/src/')) return;
    for (const specifier of imports) {
        if (specifier === 'zod' || specifier.startsWith('.')) continue;
        report('contracts-purity', path, `imports "${specifier}"`);
    }
};

/** README §3 — import a workspace package from its root, never past it. */
const checkDeepPackageImports = (path, { imports }) => {
    for (const specifier of imports) {
        if (/^@inventory-system\/[^/]+\/.+/.test(specifier)) {
            report('deep-package-import', path, `imports "${specifier}"`);
        }
    }
};

/** backend.md §1.4 — Prisma lives in repositories. */
const checkPrismaBoundary = (path, { imports }) => {
    if (!path.startsWith('packages/api/src/')) return;
    if (path.startsWith('packages/api/src/repositories/')) return;
    if (imports.some((specifier) => specifier === '@inventory-system/database')) {
        report('prisma-outside-repository', path, 'imports @inventory-system/database');
    }
};

/** backend.md §1.3 — services know nothing about HTTP. */
const checkServicePurity = (path, { imports }) => {
    if (!path.startsWith('packages/api/src/services/')) return;
    if (imports.some((specifier) => specifier === 'express' || specifier.startsWith('express/'))) {
        report('express-in-service', path, 'imports express');
    }
};

/** backend.md §1.5 — domain functions are pure. */
const forbiddenInDomain = ['express', '@inventory-system/database', '@prisma/client'];
const checkDomainPurity = (path, { imports }) => {
    if (!path.startsWith('packages/api/src/domain/')) return;
    for (const specifier of imports) {
        if (forbiddenInDomain.some((prefix) => specifier.startsWith(prefix))) {
            report('domain-purity', path, `imports "${specifier}"`);
        }
    }
};

/** backend.md §1.2 — a controller that cannot fit in 150 lines is holding a service. */
const checkControllerSize = (path, { lineCount }) => {
    if (!/^packages\/api\/src\/controllers\/.+\.ts$/.test(path)) return;
    if (lineCount > LIMITS.controller) {
        report('controller-too-large', path, `${lineCount} lines > ${LIMITS.controller}`);
    }
};

/** frontend.md §3.3 — components stay under 200 lines. */
const checkComponentSize = (path, { lineCount }) => {
    if (!/^apps\/[^/]+\/src\/.+\.tsx$/.test(path)) return;
    if (isTestFile(path) || isStoryFile(path)) return;
    if (lineCount > LIMITS.component) {
        report('component-too-large', path, `${lineCount} lines > ${LIMITS.component}`);
    }
};

/** frontend.md §2.1 — routes compose, they do not work. */
const checkRouteSize = (path, { lineCount }) => {
    if (!/^apps\/[^/]+\/src\/app\/.*\/(page|layout)\.tsx$/.test(path)) return;
    if (lineCount > LIMITS.route) {
        report('route-too-large', path, `${lineCount} lines > ${LIMITS.route}`);
    }
};

/** frontend.md §2 — features are consumed through their public surface. */
const checkFeatureEncapsulation = (path, { imports }) => {
    // A test or story exists to exercise a specific unit, so it may reach for that unit directly.
    if (isTestFile(path) || isStoryFile(path)) return;
    const match = /^apps\/[^/]+\/src\/features\/([^/]+)\//.exec(path);
    const own = match?.[1];
    for (const specifier of imports) {
        const target = /^@\/features\/([^/]+)\/(.+)$/.exec(specifier);
        if (!target) continue;
        const [, feature, rest] = target;
        if (feature === own) continue;
        if (rest === 'index') continue;
        report(
            'feature-reach-in',
            path,
            `imports "${specifier}" instead of "@/features/${feature}"`
        );
    }
};

/** frontend.md §11.1 — every shared UI component ships a story and a test. */
const checkUiCoverage = (path, absolute) => {
    if (!/^packages\/ui\/src\/(atoms|molecules|organisms)\/[^/]+\.tsx$/.test(path)) return;
    if (isTestFile(path) || isStoryFile(path)) return;
    if (!hasSibling(absolute, '.test')) report('ui-missing-test', path, 'no co-located .test file');
    if (!hasSibling(absolute, '.stories'))
        report('ui-missing-story', path, 'no co-located .stories file');
};

/** frontend.md §11.1 — every hook and utility is unit tested. */
const checkHookAndUtilCoverage = (path, absolute) => {
    if (!path.startsWith('apps/') && !path.startsWith('packages/ui/')) return;
    if (isTestFile(path) || isStoryFile(path)) return;

    const file = basename(path);
    const isHook = /(^|\/)hooks\.tsx?$/.test(path) || /^use-[\w-]+\.tsx?$/.test(file);
    const isUtil = /\/utils\/[^/]+\.tsx?$/.test(path);
    if (!isHook && !isUtil) return;

    if (!hasSibling(absolute, '.test')) {
        report(
            isHook ? 'hook-missing-test' : 'util-missing-test',
            path,
            'no co-located .test file'
        );
    }
};

/** README §7 — a TODO without an issue key is a TODO nobody will do. */
const checkTodoOwnership = (path, { text }) => {
    for (const match of text.matchAll(/\b(TODO|FIXME)\b(?!\(OMN-\d+\))/g)) {
        const line = text.slice(0, match.index).split('\n').length;
        report('untracked-todo', path, `${match[1]} without an OMN issue key at line ${line}`);
    }
};

const fileRules = [
    checkCrossPortalImports,
    checkUiPurity,
    checkContractsPurity,
    checkDeepPackageImports,
    checkPrismaBoundary,
    checkServicePurity,
    checkDomainPurity,
    checkControllerSize,
    checkComponentSize,
    checkRouteSize,
    checkFeatureEncapsulation,
    checkTodoOwnership,
];

// ---------------------------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------------------------

const scanRoots = [join(repoRoot, 'apps'), join(repoRoot, 'packages')];
const files = scanRoots.flatMap((root) => walk(root));

for (const absolute of files) {
    const path = toPosix(absolute);
    const source = readSource(absolute);
    for (const rule of fileRules) rule(path, source);
    checkUiCoverage(path, absolute);
    checkHookAndUtilCoverage(path, absolute);
}

const key = ({ target, detail }) => `${target} :: ${detail}`;

/**
 * Size rules carry a measurement, so their baseline entry is a ceiling rather than an exact string:
 * a grandfathered file may shrink freely, but growing past its recorded size is a new violation.
 */
const SIZE_RULES = new Set(['controller-too-large', 'component-too-large', 'route-too-large']);
const measurementOf = (entry) => Number(/::\s*(\d+)/.exec(entry)?.[1] ?? Number.NaN);
const targetOf = (entry) => entry.split(' :: ')[0];

const current = {};
for (const violation of violations) {
    (current[violation.rule] ??= []).push(key(violation));
}
for (const rule of Object.keys(current)) current[rule] = [...new Set(current[rule])].sort();

if (process.argv.includes('--update-baseline')) {
    const sorted = Object.fromEntries(
        Object.entries(current).sort(([a], [b]) => a.localeCompare(b))
    );
    writeFileSync(baselinePath, `${JSON.stringify(sorted, null, 4)}\n`);
    const total = Object.values(sorted).reduce((sum, entries) => sum + entries.length, 0);
    console.log(`Baseline updated: ${total} grandfathered violation(s) recorded.`);
    process.exit(0);
}

const baseline = existsSync(baselinePath) ? JSON.parse(readFileSync(baselinePath, 'utf8')) : {};

const introduced = [];
const fixed = [];

const isKnown = (rule, entry) => {
    const entries = baseline[rule] ?? [];
    if (entries.includes(entry)) return true;
    if (!SIZE_RULES.has(rule)) return false;

    const recorded = entries.find((known) => targetOf(known) === targetOf(entry));
    return recorded !== undefined && measurementOf(entry) <= measurementOf(recorded);
};

for (const [rule, entries] of Object.entries(current)) {
    for (const entry of entries) {
        if (isKnown(rule, entry)) continue;
        const ceiling = SIZE_RULES.has(rule)
            ? baseline[rule]?.find((known) => targetOf(known) === targetOf(entry))
            : undefined;
        introduced.push(
            ceiling ? `${rule}: ${entry} (grew past the baselined ${ceiling})` : `${rule}: ${entry}`
        );
    }
}
for (const [rule, entries] of Object.entries(baseline)) {
    const targets = new Set((current[rule] ?? []).map(targetOf));
    for (const entry of entries) {
        const stillViolates = SIZE_RULES.has(rule)
            ? targets.has(targetOf(entry))
            : (current[rule] ?? []).includes(entry);
        if (!stillViolates) fixed.push(`${rule}: ${entry}`);
    }
}

const baselineTotal = Object.values(baseline).reduce((sum, entries) => sum + entries.length, 0);
console.log(
    `Standards check: ${files.length} files, ${violations.length} violation(s), ${baselineTotal} baselined.`
);

if (fixed.length > 0) {
    console.log(`\n${fixed.length} baselined violation(s) no longer occur. Remove them:`);
    for (const entry of fixed.sort()) console.log(`  - ${entry}`);
    console.log('\n  node tools/check-standards.mjs --update-baseline');
}

if (introduced.length > 0) {
    console.error(`\nFAIL — ${introduced.length} new violation(s) of docs/standards:\n`);
    for (const entry of introduced.sort()) console.error(`  x ${entry}`);
    console.error('\nSee docs/standards/README.md. Fix the code; do not extend the baseline.');
    process.exit(1);
}

console.log('\nOK — no new violations.');
