---
status: accepted
---

# A direction word and a dropped leading minus are formatting, not arithmetic

The Overview and the Net worth page read the ledger's signs, not a person's ([#323](https://github.com/trajectonomics/trajectonomics/issues/323)): "Salary Income −900,000.00" reads as a loss, and both cards explained the convention in a sentence instead of showing the figure the way a person reads it. [ADR 0002](0002-the-cli-is-the-only-source-of-figures.md) says the Dashboard shows the CLI's decimal strings as they are, so the change needed a decision before any page changed.

## Decision

- **A direction word and a dropped leading minus are formatting.** `directedAmount` in `src/lib/format/direction.ts` takes the CLI's amount string and its meaning (income, expense or liability) and answers `{ word, digits }`. `digits` is the CLI's string with at most its leading `-` removed, and `word` is "Money in", "Money out" or "You owe". No digit is added, removed, rounded or recomputed, and nothing is parsed to a number. This is how ADR 0002's "shows the CLI's decimal strings as they are" is kept rather than amended.
- **The ledger's signed figure stays available.** The amount keeps it in its `title` ("The ledger states −184,000.00 THB"), so a reviewer can still match the row to the `traj` output. The title is left off while amounts are hidden, so the hide-amounts switch masks the digits everywhere.
- **Three places show the words.** The Overview's Profit and loss card reads its total and its "Largest rows" by direction, and a total that is negative (a loss) reads as "Money out"; the Assets and liabilities card and the Net worth page's liability list read every liability as "You owe".
- **The sentences that explained the convention go.** "Income is shown negative and expenses positive, as the ledger books them." and "Liabilities, shown negative as the ledger states them" are removed: the words say it without teaching a sign convention.
- **A test pins that the digits are the CLI's own.** `direction.test.ts` holds `-0.01`, `0.00`, a large amount and a negative liability, and checks that the displayed digits are the input with at most a leading minus removed. The component tests of the three surfaces check the words, the title and the mask.

## Considered Options

- **A display field from the CLI (`amountAbs` with a `direction`) on the reads Home uses.** Rejected for now: it changes the CLI's contract and every consumer of these reads for something the page can derive by dropping a minus, and it would still need a word for each direction. Option (b) of the issue stays open if the CLI ever needs the same words itself.
- **Keeping the sentences and the signed amounts.** Rejected: the issue is that a person reads a salary as a loss, and an explanation does not fix the figure.
- **Letting a component choose the word.** Rejected: the word would repeat in three components and drift. One pure function owns the three meanings.

## Consequences

- A new surface that shows money to a person reads it through `DirectedMoney` (`src/components/ui/DirectedMoney.svelte`), which takes the amount and its meaning; the signed CLI string and the mask come with it.
- The three surfaces still show the CLI's figure: the visible digits are the CLI's digits, and the title is the CLI's signed string.
- `grep -rn "as the ledger books them\|as the ledger states them" apps/web/browser apps/web/src/routes` finds nothing, so no browser test or screenshot text matches the removed sentences.
