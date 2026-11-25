---
status: accepted
---

# Plan items are named by what a Read states, and a name is never made up

The Dashboard printed ids where a person expects names ([#322](https://github.com/trajectonomics/trajectonomics/issues/322)): `salary` on a card, `me` and `mali` on the household card, `car-paid-off` on a chart marker, `flows.fund.end at me, age 60` as an anchor. [#519](https://github.com/trajectonomics/trajectonomics/pull/519) did this for Accounts, whose names the ledger holds. This is the rest of the items.

## Decision

- **One lookup, `src/lib/view/item-names/`.** `itemNames(accountNames, household)` gives every surface the same words for an id, by kind (`flow`, `account`, `milestone`, `person`). A component reads it through `currentItemNames()` (`src/client/item-names.svelte.ts`), which follows the plan the address names, as every page chooses its plan. A view model that needs it for one plan builds it with `snapshotItemNames(snapshot, plan)`. `ItemName.svelte` prints one id, and `currentItemText` gives the same words as plain text for an aria-label, an option or a notice.
- **A name comes from a Read and from nothing else.** The CLI's output names three kinds of item:
  - an Account, by the ledger (`account list`), through the account names;
  - a person, by the role the household states: the holder is "You", a partner "Your partner", a dependent "Child", "Parent" or "Dependent", with the id in brackets when two people share a role;
  - a Flow and a Milestone have an `id` and no name, anywhere in the output (`scenario show`, `projection run`, `schema`).
- **An id is not a name.** The page does not turn `car-paid-off` into "Car paid off" or capitalise a Flow's id: that is a name the CLI never stated, it is lossy (`me` cannot become "You" by a rule on the text), and a person who writes `car-paid-off` and sees "Car paid off" cannot tell which id an Edit will name. An id with no name shows in code (`<code>`, or the monospace face in a chart's label, `LineMarker.code`). The What-if bar leads with the id as it stands, as it already did for an Account the ledger does not name.
- **An anchor is words built from its structure.** A path `flows.fund.end` is an item (`fund`, named by the lookup) and a date ("ends"), and the person reads as the household's words: "fund ends at you, age 60". A path with no words (a field this page does not know) is shown whole, in code.
- **Pickers keep the id as the value, and an Edit still sends ids.** The label is the lookup's words; nothing in the document, the argv or a `data-*` key changes. The id stays on the household card (an "Id" row) and in every Edit.

## Considered Options

- **A formatter that turns an id into words** (the first step of #322). Rejected for the reasons above; it would show the page's guess as if the CLI had said it.
- **A display `label` on Scenario items and household people** (the second step of #322). This is the real fix and it is a change to the Scenario document: a new field in sim, the CLI's schema and the contract, which needs its own ADR there. Until it lands the lookup has one place to read it from, `itemLabel`, so no surface changes.

## Consequences

- A Flow, a Milestone and an anchored item show as their ids, in code, on every page. The issue's names for them ("Car paid off", "Fund ends when you turn 60") wait for the CLI to state a name.
- People are named everywhere: cards, anchors, pickers, the ages of a year, the FI ages on a Plans card, the cash flow year picker.
