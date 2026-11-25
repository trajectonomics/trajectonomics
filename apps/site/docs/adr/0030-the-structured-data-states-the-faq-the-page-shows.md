---
status: accepted
---

# The Structured data states the FAQ the page shows

[ADR 0017](./0017-crawlers-and-answer-engines-read-the-same-facts.md) kept `FAQPage` out of the
Structured data because no FAQ existed to support it. [ADR 0023](./0023-features-carry-cli-samples-and-the-page-gains-a-faq-and-a-closing-cta.md)
added the FAQ, so that reason no longer holds.

## Decision

- **The graph gains an `FAQPage` node.** It lists one `Question` per pair of the Dictionary's
  `faqQuestions` and `faqAnswers`, each with an `acceptedAnswer` of type `Answer`, in the page's order and
  the Language's own text. It is built by `src/lib/site/structured-data-faq.ts`.
- **The text is the Dictionary's text, unchanged.** The FAQ component renders each string as escaped
  text, so the page shows the string as written. A string that carried markup would show its tags, so no
  stripping is done: a test rejects `<` and `>` in any FAQ string instead.
- **Only what the page shows is stated.** The FAQ is on the home page, so the node sits in the home
  page's graph and nowhere else.

## Consequences

- A search engine or an answer engine reads the same questions and answers a visitor reads.
- `aggregateRating`, `review`, `reviewRating` and `SearchAction` remain forbidden: the page shows no
  rating, no review and no search.
- The build check compares each home page's block with the graph, so a changed answer that is not
  rebuilt into the page fails the build.
