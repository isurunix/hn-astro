# ADR-0007: Pin Node.js version via .nvmrc

**Status:** Accepted  
**Date:** 2026-06-21

## Context

Cloudflare Pages auto-detects the build environment. Without a Node.js version specification, it defaults to Node 18 or 20 depending on the build image. Local development uses Node 24.

## Decision

Add `.nvmrc` with content `24` at the project root.

## Rationale

Cloudflare Pages reads `.nvmrc` to determine which Node.js version to provision for the build. Using the same major version as local development ensures consistent behaviour across the `npm install` → `npm run build` pipeline.

Additionally, specific npm behaviours (lock file generation, optional dependency resolution) differ between npm versions that ship with each Node major (see ADR-0008). Pinning the Node version is a prerequisite for pinning the effective npm version.

## Consequences

- Cloudflare Pages provisions Node 24.x for all builds
- Local developers should also use Node 24 (or use nvm: `nvm use`)
- If Node 24 is ever retired from Cloudflare's supported list, update `.nvmrc` and create a new ADR
