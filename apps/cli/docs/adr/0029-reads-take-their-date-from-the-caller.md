# Read-only commands take their date from the caller, never from the clock

Every command that states a reading of the Ledger at a date takes that date as a required flag: `balance --as-of`, `report networth --as-of`, `report pnl --until` with `--since` optional. Nothing defaults from the clock and nothing derives a date from the data. ADR-0018 makes the same rule for commands that write; a read that says "today" is not reproducible, because the answer changes overnight while its arguments do not.

`--since` is the only optional date, and only because its absence has a meaning the core already owns: "from the start of the Ledger". An absent end would have to be invented.

## Considered options

Defaulting `--until` to the date of the latest posted Transaction was rejected. It is deterministic, but it derives the answer's boundary from the data rather than from the caller, and it is undefined on an empty Ledger — the one case where a report should be plainly empty rather than silently reinterpreted. Defaulting either end to the clock was rejected for the reason in ADR-0018: a laptop in Bangkok and a build server in UTC disagree about the date for seven hours of every day.

## Consequences

A human types the date or lets their shell supply it; an agent always has one. Every result echoes the As-of it was stated at, so a stored report can be read later without guessing its boundary. A caller who wants "as of now" spells it, which is what makes it their choice rather than the CLI's.

## Addendum

A result may also state a date the data supplies when that date qualifies the answer. The rule above is about which date the reading is *taken at*; it never forbids a result from reporting a date it read. `report networth` states `firstTransactionDate` and `noTransactionsBefore`, because an As-of before the Ledger's first Transaction is not a reading of zero: the zero rows and totals mean the record has not started, not that the person held nothing, and without the fields a month-on-month comparison charges the whole Balance to the month the record began (cli#149). The pair is a field rather than an error because the date the caller typed is valid and the empty answer is the true one; the false part was the silent 0.00. `balance` and `baseline show` read the same Ledger and did not state it then; the second addendum adds it there under the same two names.

## Second addendum

`balance` and `baseline show` state `firstTransactionDate` and `noTransactionsBefore` too, under the names and the rule `report networth` has, and all three take the pair from one helper (`src/report/record.ts`) so they cannot answer the same Ledger differently (cli#95). The fields are always present, and they are additive: a reader of the older shape ignores them.

A Ledger with no Transaction has no record at any date, so `firstTransactionDate` is null and `noTransactionsBefore` is **true**. The earlier rule, `firstTransactionDate !== null && firstTransactionDate > asOf`, forced a null first date to false, which read as "the record has started" on the one Ledger where it has not, and it contradicted the field's own description. No third state is added: the pair stays a date and a boolean, and `noTransactionsBefore` now reads "no Transaction is dated on or before the As-of", which is true of an empty Ledger by definition.

The human Format prints a `note:` line under the reading when `noTransactionsBefore` is true, one sentence that names the first Transaction's date (or says the Ledger records none) and says the figures state that the record has not started, not that nothing is held. JSON carries no sentence: it has the pair. A result that already carries the store's `hint` prints no note, because the hint is the last line (ADR-0040) and already says the Ledger is empty; an `--as-of` before the record on a populated Ledger still gets no `hint`, as ADR-0040 requires, and gets the pair and the note instead. The Dashboard reads the new fields as optional, so it keeps parsing the output of an older `traj`.
