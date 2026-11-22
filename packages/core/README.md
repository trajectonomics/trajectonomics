# @trajectonomics/core

Pure personal-finance building blocks in one package: money, a double-entry ledger, Thai and US income tax, and a deterministic projection engine. Each piece is a subpath export.

## Not published

This package is private: it is not on npm. The `traj` CLI (`apps/cli`) bundles it into its binaries,
and nothing else consumes it. Inside this repository, depend on it with `"@trajectonomics/core": "workspace:*"`.

## Subpaths

| Import | What it is | Source |
|---|---|---|
| `@trajectonomics/core/money` | Major units to integer minor units and back | [money/](./money/README.md) |
| `@trajectonomics/core/ledger` | Double-entry domain: accounts, postings, balances, net worth, P&L | [ledger/](./ledger/README.md) |
| `@trajectonomics/core/tax` | Multi-jurisdiction income tax engine (shared entry) | [tax/](./tax/README.md) |
| `@trajectonomics/core/tax/th` | Thailand 2026 income tax and levy | [tax/](./tax/README.md) |
| `@trajectonomics/core/tax/us` | United States 2026 federal and 50-state income tax | [tax/](./tax/README.md) |
| `@trajectonomics/core/sim` | Deterministic personal-finance projection engine | [sim/](./sim/README.md) |
| `@trajectonomics/core/package.json` | This package's manifest (name and version) | |

```ts
import { toMinorUnits } from "@trajectonomics/core/money"
import { calculateThTax } from "@trajectonomics/core/tax/th"

const { totalTax } = calculateThTax({
	filingStatus: "single",
	income: { section40_1: 800_000 },
})
console.log(toMinorUnits(12.34, 2), totalTax)
```

## Purity guarantees

- **No I/O.** No file, network or environment access in any subpath. Ledger reads `Intl` only to resolve currency digits.
- **No clock or randomness.** Dates and as-of values are inputs. Projections are reproducible.
- **Self-contained.** The internal packages are bundled into `dist/`. Installing this package pulls in no other `@trajectonomics/*` package.
- **Dependency direction is checked.** `packages/core/scripts/check-deps.ts` (part of `check`) fails the build if `money` or `sim` import any internal package, if `ledger` imports anything but `money`, or if `tax` imports `sim` outside its test files.

## Development

`bun run check` runs lint, typecheck, the import rules, publint and attw (turbo builds first). Each folder keeps its own tests and checks (`turbo run check --filter='./packages/core/*'`).

## License

MIT. See [LICENSE](./LICENSE).
