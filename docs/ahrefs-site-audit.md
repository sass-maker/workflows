# Ahrefs Site Audit health

Collect Ahrefs Site Audit Health Score, crawl freshness, crawled internal
URLs, and error/warning/notice counts for the canonical root brands owned by
Site Health.

This is a reusable operator workflow. It is not a Site Health product surface
and it is not part of the credential-free public availability catalog.

## Command

```bash
node scripts/ahrefs-site-audit-health.mjs
```

Optional flags:

- `--brands-path <file>` — JSON catalog with a `brands` array. Defaults to
  the sibling Site Health file
  `../site-health/apps/backend/config/root-brands.json`.
- `--output <file>` — markdown report path. Defaults to
  `docs/ahrefs-site-audit-latest.md`.
- `--max-age-days <n>` — crawl freshness window. Defaults to `14`.

## Credentials

Set `AHREFS_API_KEY` in the runtime environment only. Do not commit it, put
it in this repository's secrets, or persist provider response bodies.

Site Audit is a paid Ahrefs Management API. The free Domain Rating key used
by Drank and PSI Swarm is not sufficient; a missing entitlement fails closed
with `auth-entitlement-error` (HTTP 401 or 403) and writes no zero scores.

The collector fails closed when:

- the API key is missing;
- Ahrefs returns 401 or 403 (missing Site Audit entitlement);
- the Site Health brand catalog is missing;
- the provider request fails or returns an invalid payload.

Unavailable metrics stay null. They are never written as zero.

## Ownership

| Concern | Owner |
|---|---|
| Canonical root brand catalog | Site Health |
| Dashboard, Search Console, AI visibility, performance portfolio | Site Health |
| Reusable collector, markdown report, and this skill adapter | Workflows and Skills |

The preserved copy under `preserved/legacy-fleet-tooling/` is historical. Do
not invoke it.

## Report

The generated markdown at `docs/ahrefs-site-audit-latest.md` is operator
evidence. It contains public root domains, crawl dates, and Site Audit
counts. It does not contain API keys, Authorization headers, or raw Ahrefs
payloads.
