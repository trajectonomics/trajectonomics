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

## Amended 2026-11-26: a plan states a display label, and the lookup reads it

The CLI now states a display name for a Flow, a Milestone and a person: `displayLabel` in the Scenario document and the household document (sim ADR 0032, cli ADR 0080). The second step this ADR named has landed, so the decision changes in one place and in no other.

- **The lookup has a third source, the plan's document.** `itemNames(accountNames, household, document)` also reads `document.flows` and `document.milestones`, and `snapshotItemNames` and `currentItemNames()` pass the document from the Snapshot's `scenario show` Read. `labels.ts` builds the two maps; an item with no `displayLabel` is left out, and `itemLabel` falls back to the id in code exactly as before. A person's `displayLabel` wins over the role words ("You", "Your partner"); the role words remain the fallback when the household states no label, so a plan without labels reads as it did.
- **The label is what the CLI states, and the page still invents nothing.** The label comes from the document, never from the id's text. An item with no label keeps showing its id in code (`<code>`, or `LineMarker.code`), so the page's guess is still never printed.
- **The forms write the label, and the id stays the id.** The Flow form and the person form gain a "Name" field that writes `displayLabel`; the id keeps its own field (marked "Id" for a new item) and every Edit still sends ids. The form trims the name before it sends it, because `traj` refuses untrimmed text rather than rewriting it. There is no Milestone form in the Dashboard, so a Milestone's label is read from the document and a person sets it with `traj scenario apply --set`; the lookup, the chart marks and the Milestones page show it as soon as the Snapshot is read again.
- **A chart's mark still says whether it is code.** `LineMarker.code` is true only for an id with no label, so a labelled Milestone reads in the interface face and an unlabelled one stays monospaced.
- **Two items of one kind that share a label read `label (id)`.** A plan may give two Flows, or two Milestones, the same `displayLabel`, and a dry run accepts it. `labels.ts` counts each kind's labels and appends the id to every repeated one, so a picker, a card and the What-if bar can tell them apart. A Flow and a Milestone that share a label are not twins. The id is the CLI's own, so the page still invents nothing (#641).

## Amended 2026-11-27: a chart's series are told apart in words, never by their key

A custom chart's series name is told apart in steps, in this order: the series' own name, then "(item)", then "(item, category)", then "(item, category, Account)". The item is the Flow or category id, the Account is the ledger's name for it, and a line that names no category says so in words. A real category whose name reads like the words for no category is quoted (`"no category"`), so a real category never reads as none. If two ids still read alike after every step, the first id in sorted order keeps its words and the later ones take " (2)", " (3)", and so on (#671).

A series no plan states, such as a saved chart naming a Flow the plan has removed, reads the same words built from its id, in the picker's "Not in this plan" list and in the chart's "Not on this plan" list. A chart's series name and the default name a chart is saved under therefore never show a series key (`cash:[...]`, `account:...`) and never contain a `[`.
