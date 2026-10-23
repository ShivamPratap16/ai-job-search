# cutshort-cli

Zero-dependency Bun CLI behind the `cutshort-search` skill. See `../SKILL.md` for usage and `../url-reference.md` for endpoints.

```bash
bun install        # dev types only
bun run typecheck
bun test           # offline: flag contract, helpers, portal parsing
PORTAL_LIVE_TESTS=1 bun test tests/live.test.ts   # live smoke test
```

`src/core.ts`, `src/cli.ts`, `src/commands/*` and `tests/cli-contract.test.ts` are shared, identical copies across the India portal CLIs (instahyre, internshala, unstop, cutshort, hirist, ats); `src/portal.ts` and `tests/portal.test.ts` are this portal's own.
