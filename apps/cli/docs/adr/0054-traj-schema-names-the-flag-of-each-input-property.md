# `traj schema` names the flag of each input property

`traj schema <command>` printed a command's input as JSON Schema properties in camelCase (`externalRef`, `dryRun`) and nothing else, while the parser takes kebab-case flags. An agent told to take every flag from `traj schema` ran `tx add --externalRef` and got `unknown_flag` (#307).

Each non-positional property of `input` now carries `flag`, the exact spelling the parser accepts: `"externalRef": { "type": "string", "flag": "--external-ref" }`. A positional has no `flag`, because it is a word, not a flag. The value is read from the leaf's derived flags (`deriveFlags`, ADR-0015), the same table `parseArgs` is configured from, so the two cannot drift. A test runs every published flag through its leaf's own parser.

## Considered options

A separate `flags` list beside `input` was rejected: it would put a second place to read next to the property the agent is already reading, and a property and its flag belong together. `flag` is an annotation keyword unknown to JSON Schema, which validators ignore, so the `input` stays a valid schema and the change is additive. It does not clash with `document.flag`, which names an input field one level up.

## Consequences

A prose rule that says "turn camelCase into kebab-case" is now redundant; a skill or a Docs Portal page that states one should point at the published `flag` instead. Those packages change in their own pull requests.
