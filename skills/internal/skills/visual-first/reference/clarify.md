# Clarify

Make the words that stay as few and as plain as they can be.

## Steps

1. **Read the whole path:** the screen, the one before it and the one after it, so each word is judged where a person meets it.
2. **For each state, order the words:** the one fact the person needs now, the next action, and only then any context that changes the decision.
3. **Apply the limits:**
   - a label is one to three words, and a sentence at most 15, in the active voice;
   - each idea is said once per screen;
   - one concept has one word, taken from the package's `GLOSSARY.md` and the person's words in #700. Engine words move to Details or `--json`.
4. **Name actions by their outcome:** "Save plan" and "Delete plan", not "OK", "Submit" or "Yes". A destructive action names what is lost, and offers undo in place of a confirmation where recovery is safe.
5. **Write errors as what failed and how to fix it**, plus why only when the reason changes the fix. Keep the person's input. An internal code goes in Details. CLI text marked `data-cli` in the Dashboard stays as the CLI wrote it.
6. **Make loading name the real operation** ("Reading your plan"), and invent no progress.
7. **Write whole sentences**, never pieces joined in code, so a translation reads naturally. Numbers and dates go through the package's format helpers.
8. **Run the delete test on every string:** take it out, look again, and leave it out if nothing is lost.

## Done when

Every string on the screen is listed as before → after, or as kept with its reason. The pull request shows the screen's word total before → after.
