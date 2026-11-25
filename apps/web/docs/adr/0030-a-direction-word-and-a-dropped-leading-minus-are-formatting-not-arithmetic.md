---
status: accepted
---

# A direction word and a dropped leading minus are formatting, not arithmetic

The Overview and the Net worth page read the ledger's signs, not a person's ([#323](https://github.com/trajectonomics/trajectonomics/issues/323)): "Salary Income −900,000.00" reads as a loss, and both cards explained the convention in a sentence instead of showing the figure the way a person reads it. [ADR 0002](0002-the-cli-is-the-only-source-of-figures.md) says the Dashboard shows the CLI's decimal strings as they are, so the change needed a decision before any page changed.

## Decision

- **A direction word and a dropped leading minus are formatting.** `directedAmount` in `src/lib/format/direction.ts` takes the CLI's amount string and what it is about — a row of money earned or spent, a balance owed, or a net total — and answers `{ word, digits }`. `digits` is the CLI's string with at most its leading `-` removed. The **sign picks the word and the kind picks the pair**: for a row the ledger books a debit positive, so a leading `-` is "Money in" and no sign is "Money out"; for a liability a leading `-` is "You owe" and no sign is "Owed to you"; for a total, which the CLI states as income less expenses, a positive figure is "Money in". Zero has no direction, whether the CLI writes `0.00` or `-0.00`, and gets no word. No digit is added, removed, rounded or recomputed, and nothing is parsed to a number. This is how ADR 0002's "shows the CLI's decimal strings as they are" is kept rather than amended.
- **The ledger's signed figure stays available.** The amount keeps it in its `title` ("The ledger states −184,000.00 THB"), so a reviewer can still match the row to the `traj` output. The title is left off while amounts are hidden, so the hide-amounts switch masks the digits everywhere.
- **Three places show the words.** The Overview's Profit and loss card reads its "Largest rows" by their sign and its total by its sign as income less expenses; the Assets and liabilities card and the Net worth page's liability list read a negative liability as "You owe" and a positive one, an overpaid liability, as "Owed to you". The account type never decides the word on its own: a refunded expense is money in and a reversed income is money out ([#585](https://github.com/trajectonomics/trajectonomics/pull/585)).
- **The sentences that explained the convention go.** "Income is shown negative and expenses positive, as the ledger books them." and "Liabilities, shown negative as the ledger states them" are removed: the words say it without teaching a sign convention.
- **A test pins that the digits are the CLI's own, and that the sign decides.** `direction.test.ts` holds `-0.01`, `0.00` and `-0.00`, a large amount (`-90071992547409.91`, the safe minimum in minor units, since the CLI cannot emit a larger one) and the three rows of #585: a `-1500.00` expense refund, a `700.00` income reversal and a `50.00` overpaid liability. It checks that the displayed digits are the input with at most a leading minus removed, and that each sign gets its word. The component tests of the three surfaces check the words, the title, the mask and the zero.

## Considered Options

- **A display field from the CLI (`amountAbs` with a `direction`) on the reads Home uses.** Rejected for now: it changes the CLI's contract and every consumer of these reads for something the page can derive by dropping a minus, and it would still need a word for each direction. Option (b) of the issue stays open if the CLI ever needs the same words itself.
- **Keeping the sentences and the signed amounts.** Rejected: the issue is that a person reads a salary as a loss, and an explanation does not fix the figure.
- **Letting a component choose the word.** Rejected: the word would repeat in three components and drift. One pure function owns the three meanings.

## Consequences

- A new surface that shows money to a person reads it through `DirectedMoney` (`src/components/ui/DirectedMoney.svelte`), which takes the amount and its kind; the signed CLI string and the mask come with it. A new kind of amount adds a pair of words to `directedAmount` rather than a word to a component.
- The three surfaces still show the CLI's figure: the visible digits are the CLI's digits, and the title is the CLI's signed string.
- The sign decides the word, so a refund of an expense reads as money in, a reversal of income reads as money out, and an overpaid liability reads as money owed to you. A zero reads as its digits alone, because it has no direction.
- `grep -rn "as the ledger books them\|as the ledger states them" apps/web/browser apps/web/src/routes` finds nothing, so no browser test or screenshot text matches the removed sentences.
