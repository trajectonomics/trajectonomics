# Distill

Bring a screen down to one focal point: one question, its answer drawn large, and at most one primary action.

## Steps

1. **Name the question and its answer.** Find them in the issue, its epic or the package's ADRs. For the Dashboard's pages, the approved epic #697 and its slice #707 name them; both are still open. When none of them states it, take the answer that the nearest ADR or `org/goals/GOALS.md` implies. Write it in the pull request as "Assumed question: …" for the owner to confirm.
2. **Sort the inventory** into three piles:
   - the answer: exactly one element;
   - the support: what a person needs to act on the answer, at most four items;
   - the rest.
3. **Move the rest one layer down**: to the Details drawer, a tab, a linked page or the hover title. Write each move down as "fact → where it went". Removing a fact from the product is the owner's decision.
4. **Cut, in this order:**
   1. information said twice, which is kept once, where it is read;
   2. intro sentences, eyebrows and section numbers that carry no sequence;
   3. decoration that carries no meaning: borders, shadows, background fills and cards inside cards (group by space instead);
   4. extra choices: at most four siblings, and one primary action.
5. **Lower everything except the answer.** The answer alone is at display size and in the accent colour. The support is at body size in neutral tokens. Each screen gets one accent colour, and a state colour only where the state matters.

## Done when

- the squint test passes: only the answer stands out;
- there is exactly one display-size element and at most one primary action;
- every fact you moved is listed with where it went.
