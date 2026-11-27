# A Scenario has a decimal form, and the CLI converts it exactly rather than through the money core

A Scenario document states money as integer minor units (ADR-0024), so a person typing `9,000.50`
has to be turned into `900050` by someone, and the page that shows the document must be given
`"9000.50"` back. The Dashboard does not convert money (web ADR 0002), so `traj` does it: a
Scenario has a **decimal form**, the same document with each money field written as a decimal
string of the Currency's major unit. `traj scenario show <name> --decimal` prints it, and
`traj scenario apply <name> --file <file|-> --decimal` reads it. The stored document is still the
minor-unit one, so saving what `show --decimal` printed leaves the plan byte-identical and its hash
unchanged (ADR-0024). This ships in 0.8.0.

## What is money

Nothing lists the money fields by hand. A money field is a node of the published document schema
whose description is `MINOR_UNITS` (`src/scenario/shape/terms.ts`), and the decimal form is built
by walking that same schema (`src/scenario/field-paths.ts`). The walk follows `properties` and
`items`, so a new money field there is converted as soon as it is published; one reached only through
`anyOf` would be found by `moneyPathsOf` but not converted. The test that names the current money
fields fails on either, and that test, not the walk, is what makes the author of a new money field
review it for the decimal form. The decimal schema's root description says which numbers are not
money fields and stay in minor units: those inside a `derive` graph and inside `levies`. Rates, counts and every other number stay integers. Derive graphs and Levies stay as
stored, because their numbers are not marked as money.

## How the conversion is done

The CLI's own exact pair in `src/store/money.ts` does it: `parseMinorUnits` for a string and
`formatMinorUnits` for a number, both on text and BigInt with the digits of the Currency. It does
not use the `money` core's `toMinorUnits`, which takes a `number`, so a decimal string would pass
through a double on its way to the minor units (#114). Nothing is rounded: a value with more places
than the Currency has is refused.

- A JSON number in a money field, a grouped string such as `9,000.50`, or text that is not a plain
  decimal is `invalid_input` (exit 2) at its document path, with the hint that names both spellings.
- A value with more places than the Currency has, or outside the safe range, is `INVALID_AMOUNT`
  (exit 3), as `tx add --amount` gives it.
- A currency that is missing or is not THB is `unsupported_currency` (exit 3), checked before any
  field.
- The core's own refusals come back as they are: a negative amount on a Flow is `invalid_input` at
  the core's path, with `NEGATIVE_AMOUNT` in `details`.

The paths of the conversion's own refusals use the Override grammar (ADR-0024), so a list item with
an `id` is named by it: `document.flows.salary.amount`. The core's refusals keep the index paths
they have always had (`document.flows.0.amount`). The two conventions sit side by side until the
core's paths follow the same grammar, which needs its own ticket.

## The flag selects the form before the document is read

`--decimal` is a boolean input field. It selects the alternate schema of the document form
(`DocumentSpec.alternate`, ADR-0020) before the document is read, so one form is never tried on the
other. It is refused beside `--template`, with a hint naming the form that takes it. `traj schema
scenario apply` publishes both forms: the minor-unit document and the decimal one, whose money fields
are strings with the decimal unit stated.

## Considered options

The `money` core's `toMinorUnits` was rejected because it takes a `number` (#114). Hand-listing the
money fields was rejected because a new field would drift past the conversion silently. Accepting
either form in one document schema was rejected: a document would then be read by its shape, which
neither ADR-0010 nor ADR-0020 allows. A second command for the decimal form was rejected because a
second leaf needs a second name for the same document, and `--decimal` changes only how money is
written.

## Consequences

`show --decimal` refuses a Scenario whose currency is not THB, because v1 supports THB only
(ADR-0005); when a second Currency is supported, the same rule gives its digits. A future money field
under `anyOf` is named by the same table, so the test that lists them fails until it is handled.
The decimal form is a presentation of the same stored document: a projection, a diff and a fork still
read minor units.
