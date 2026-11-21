---
status: accepted
---

# Crawlers and answer engines read the same facts the page states

The Site answers a search engine today with a Sitemap, a Robots file, a Social card and one Structured
data block ([ADR 0003](./0003-thai-and-english-from-visitor-signals.md),
[ADR 0004](./0004-build-output-checks.md)). Answer engines — the assistants that read a site and then
speak for it — ask two more things: a plain-text form of the page an agent can read without parsing
HTML, and JSON-LD that names the program, not only the publisher. Nothing in the build failed when
either was wrong.

Three consultant models (Gemini 4 Hydrogen, Mistral Large 4, Grok 4.7) reviewed the plan and agreed on
every decision below. Nothing here changes what a visitor sees or what a crawler is allowed to fetch.

## Decision

- **Every agent may read every path, and the file says so by name.** `robots.txt` keeps
  `User-agent: *` and `Allow: /`, and adds one `Allow: /` group each for GPTBot, OAI-SearchBot,
  ChatGPT-User, ClaudeBot, Claude-SearchBot, PerplexityBot, Google-Extended, Applebot-Extended, CCBot
  and Bytespider. The behaviour is identical to the wildcard group; the groups state the intent,
  because the project is free and open source and wants the answers it publishes to be read. The file
  still carries no `Disallow:`, because it is read at the host root and would speak for `/docs` too,
  which another repository serves. The rule checks each named group, so a group that disappears or
  opens no path fails the build.
- **The two Answer engine files are generated from the dictionaries.** `scripts/llms-txt.ts` writes
  `/llms.txt` and `/llms-full.txt` into `public/` before every build, the way
  `scripts/hero-ground.ts` writes the hero's tile, and they are gitignored for the same reason: the
  Dictionary is the source of truth, so a file committed beside it could drift. The rendering is a
  Pure Core (`src/lib/crawl/llms-markdown.ts`, `llms.ts`, `llms-full.ts`): data in, text out, no I/O.
  `/llms.txt` follows the llmstxt.org shape — `# trajectonomics`, the Dictionary's one-line summary as
  a `> ` line, then Site, Docs, Source, Install and License — and `/llms-full.txt` is the landing
  copy in the fallback Language rendered as Markdown plus the link to every other Language's home.
  Each is judged in `src/lib/build/llms.ts`: both exist in the build, neither carries the owner's
  placeholder, and the short one names every home.
- **There are no per-page `.md` twins.** The Site is two pages with the same copy in two Languages; a
  Markdown copy of each would be two more surfaces to keep true, and the full file already carries the
  whole landing page. The Docs Portal is another repository's, and it publishes its own text.
- **The Structured data names traj, and names it only with facts the page or the repository states.**
  The `Organization` gains `logo` (the absolute apple-touch-icon URL the head already links) and
  `sameAs` (the GitHub organisation, the CLI repository, the skills repository). A third node,
  `SoftwareApplication`, names `traj`'s category (`FinanceApplication`), its platforms (`macOS, Linux,
  Windows`, the three the CLI's README installs on), `isAccessibleForFree`, an `Offer` at price `0` in
  USD, the locale home as its `url`, the Dictionary's summary, its `inLanguage`, the MIT licence the
  footer links, the CLI repository as `codeRepository` and the `Organization` as its publisher. No
  version number is stated, because no constant here can verify one. `aggregateRating`, `review`,
  `reviewRating` are forbidden by `src/lib/build/structured-data-claims.ts`: the page shows no review
  and no rating, so stating one would be an invention. A `SearchAction` and an `FAQPage` wait for the
  content that would support them; the FAQ is a later change.
- **IndexNow is one manual command with a public key.** A 32-hex key was generated once and committed
  as `public/<key>.txt`, holding the key and nothing else. `bun run indexnow` first fetches
  `https://trajectonomics.com/<key>.txt` and refuses to ping unless it answers 200 with that key, then
  POSTs the host, the key, the key's URL and every `<loc>` the Sitemap lists to
  `https://api.indexnow.org/IndexNow`. It is not part of `bun run check` and no workflow runs it,
  because this repository does not deploy. **The key is public by design**: it identifies the host and
  signs nothing, so committing it is not a secret and the no-secrets rule is untouched.
- **Site verification is a meta tag, and ships empty.** `GOOGLE_SITE_VERIFICATION_TOKEN` and
  `BING_SITE_VERIFICATION_TOKEN` in `src/lib/site.ts` are `undefined`; `src/lib/site/verification.ts`
  turns whichever the owner supplies into `google-site-verification` and `msvalidate.01` metas on the
  indexed pages only. A token this repository invented would verify nothing, so none is invented, and
  a blank token renders nothing.
- **The root 302 stays.** `/` still answers with a redirect to a Locale URL, chosen from the Visitor
  signal ([ADR 0003](./0003-thai-and-english-from-visitor-signals.md)); the Sitemap, the `hreflang`
  pair and every linked URL name the Locale homes, which are the pages.

## Considered Options

- **Name the answer engines only through `*`.** Rejected: the behaviour is the same, and the owner
  wants the intent stated, so a future `Disallow:` cannot quietly shut an answer engine out.
- **Write `llms.txt` by hand.** Rejected: it would state the description, the prompt and the links a
  second time, and the two copies would drift. A generated file cannot disagree with the page.
- **Publish a Markdown twin of every page.** Rejected: two pages, two Languages, and the full file
  already carries the landing copy end to end.
- **Add a rating, a search action or an FAQ to the Structured data now.** Rejected: no review exists,
  the Site has no search, and the FAQ is a later change. Structured data that states what the page
  does not is a claim a search engine can penalise.
- **Verify the site with a DNS TXT record.** Rejected: the DNS zone is `trajectonomics/infra`'s, so a
  token would be a second repository's change and a second account to hold; a meta tag is one constant
  in the file that owns the head.
- **Read the key from an environment variable.** Rejected: the key is not a secret, and a local run
  would then depend on a `.env` that this repository forbids.
- **Ping IndexNow from CI.** Rejected: no workflow here deploys, so a ping in CI would announce URLs
  before they are live. It stays a command the owner or an agent runs after a deploy.
- **Submit to Baidu, Yandex, Naver and Seznam by account.** Not pursued. Each needs an account and a
  verification token, and IndexNow already delivers to Bing, Yandex, Naver, Seznam and Yep.

## Consequences

- A visitor sees no change: the HTML, the CSS and the copy are as they were, and the new metas render
  only when the owner supplies a token.
- `bun run check` fails when a named crawler group disappears, when either Answer engine file is
  absent or carries the owner's placeholder, when the short one omits a home, when the key file is
  missing or states anything but the key, or when the Structured data states a rating.
- The owner's remaining step is to paste the two verification tokens into `src/lib/site.ts` after
  opening the accounts; the mechanism is built and tested, and it renders nothing until then.
- `bun run indexnow` only works after this change is deployed, because it fetches the key from the
  live Site before it submits anything.
- A further Language adds its home to the Sitemap, to `/llms.txt` and to the full file's Languages
  section with no change to any rule, because every one of them reads `LANGUAGES`.
