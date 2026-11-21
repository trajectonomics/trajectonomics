# Contributing

Most outside contributions are tax rules: read [packages/core/tax/CONTRIBUTING.md](packages/core/tax/CONTRIBUTING.md) first.
It covers what to change, the source every figure needs, and how to check a change.

## Set up

Use Bun. The repository has no npm, pnpm or yarn lockfile.

```bash
bun install
```

## Check

Run every package's checks from the root:

```bash
bun run check
```

To check one package, run Turborepo with a filter, such as `bunx turbo run check --filter=@trajectonomics/tax`.

## Pull requests

- Never commit to `main`. Branch as `feat/...`, `fix/...` or `docs/...`, and open a pull request into `main`.
- Write the pull request title as a conventional commit with the package's scope: `feat(tax): ...`, `fix(cli): ...`, `docs: ...`.
- Do not commit secrets or `.env` files.
- Do not edit a `version` field in a `package.json` by hand. The release process sets versions.
