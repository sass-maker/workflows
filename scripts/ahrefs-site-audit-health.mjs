#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  AHREFS_SITE_AUDIT_ERROR_SCHEMA,
  AhrefsSiteAuditError,
  collectAhrefsSiteAuditHealth,
  normalizeBrands,
  renderAhrefsSiteAuditErrorMarkdown,
  renderAhrefsSiteAuditMarkdown,
  sanitizeAhrefsSiteAuditResult,
} from '../lib/ahrefs-site-audit.mjs';

const REPOSITORY_ROOT = resolve(import.meta.dirname, '..');
const FLEET_ROOT = resolve(REPOSITORY_ROOT, '..');
export const DEFAULT_BRANDS_PATH = resolve(
  FLEET_ROOT,
  'site-health/apps/backend/config/root-brands.json',
);
export const DEFAULT_OUTPUT_PATH = resolve(
  REPOSITORY_ROOT,
  'docs/ahrefs-site-audit-latest.md',
);

export function loadCanonicalBrands(path = DEFAULT_BRANDS_PATH) {
  if (!existsSync(path)) {
    throw new AhrefsSiteAuditError(
      'missing-brand-catalog',
      `Site Health root-brands.json is required at ${path}. Workflows and Skills does not own the brand catalog.`,
    );
  }
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8'));
  } catch (cause) {
    throw new AhrefsSiteAuditError(
      'invalid-brands',
      `Site Health brand catalog at ${path} is not valid JSON`,
      { cause },
    );
  }
  return normalizeBrands(parsed);
}

export async function runAhrefsSiteAuditHealth(options = {}) {
  const outputPath = resolve(options.outputPath ?? DEFAULT_OUTPUT_PATH);
  mkdirSync(dirname(outputPath), { recursive: true });
  try {
    const brands = options.brands ?? loadCanonicalBrands(options.brandsPath ?? DEFAULT_BRANDS_PATH);
    const result = sanitizeAhrefsSiteAuditResult(
      await collectAhrefsSiteAuditHealth({
        apiKey: options.apiKey ?? process.env.AHREFS_API_KEY,
        brands,
        maxAgeDays: options.maxAgeDays,
        now: options.now,
        fetchImpl: options.fetchImpl,
      }),
    );
    writeFileSync(outputPath, renderAhrefsSiteAuditMarkdown(result), 'utf8');
    return { ok: result.status === 'complete', outputPath, result };
  } catch (error) {
    writeFileSync(
      outputPath,
      renderAhrefsSiteAuditErrorMarkdown(error, { now: options.now }),
      'utf8',
    );
    return {
      ok: false,
      outputPath,
      error: {
        schema: AHREFS_SITE_AUDIT_ERROR_SCHEMA,
        status: 'blocked',
        code: error?.code ?? 'unknown-error',
        httpStatus: error?.httpStatus ?? null,
        message: error?.message ?? 'Ahrefs Site Audit collection failed',
        outputPath,
      },
    };
  }
}

function argument(name, argv = process.argv) {
  const index = argv.indexOf(name);
  if (index < 0) return null;
  if (!argv[index + 1]) throw new Error(`${name} requires a value`);
  return argv[index + 1];
}

export async function main(argv = process.argv) {
  const maxAgeDays = argument('--max-age-days', argv);
  const outcome = await runAhrefsSiteAuditHealth({
    brandsPath: argument('--brands-path', argv),
    outputPath: argument('--output', argv),
    maxAgeDays: maxAgeDays == null ? undefined : Number(maxAgeDays),
  });
  if (outcome.result) {
    process.stdout.write(`${JSON.stringify(outcome.result, null, 2)}\n`);
    if (!outcome.ok) process.exitCode = 1;
    return outcome;
  }
  process.stdout.write(`${JSON.stringify(outcome.error, null, 2)}\n`);
  process.exitCode = 1;
  return outcome;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await main();
}
