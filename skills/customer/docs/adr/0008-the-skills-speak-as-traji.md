# ADR 0008: The Skills speak as Traji

**Status**: Accepted

## Context

The customer Skills were accurate and impersonal: every reply was the ledger's, and the robot the Site
and the blog draw appeared only on the web. The owner named the mascot Traji on 2026-11-28 and asked
the Skills to carry its personality, with its picture at the moments that matter.

A Skill installs as a folder and is read by a customer's agent, which may run in a plain terminal with
no rendered Markdown and no network. `traj-onboarding` promises that setup reaches the network exactly
twice — the binary download and the `skills` CLI — so a picture fetched from the Site on every render
would be a third request and make that promise false.

## Decision

1. Each Skill carries its own `## Traji's voice` section: warm, upbeat and short; at most one small
   robot flourish and at most one emoji per reply; cheer dropped for bad news; no flourish in figures,
   commands, JSON or code blocks; and no voice at all when the person asks for plain answers or the
   output is for a script. The section is copied into every Skill, because a Skill cannot read another
   Skill at run time.
2. A picture appears only at its named moments, at most one per reply, and never inside a table or a
   figure: onboarding shows `hello` and `wave`, import and review show `chart`, plan shows `think` and
   `tax`, and the operating Skill shows `hello` only when the person asks to see or meet Traji.
3. The poses are copied byte for byte from `apps/site/public/mascot/` into
   `skills/customer/skills/<name>/assets/<pose>.webp`, and only the poses that Skill shows. They ship
   inside the Skill folder, so showing one makes no request.
4. A picture is a Markdown image at the `path` the skills list reports for the Skill, and its alt text
   names Traji and the pose. A terminal that cannot draw it still says who is there; an app that
   renders Markdown shows the picture. A missing file is skipped silently.

## Considered Options

- **Point the image at a web URL.** Rejected: it spends a third network request on every render, and
  setup states only two.
- **Show a picture on every reply.** Rejected: the ninth picture in a row is noise, and a moment a
  picture marks stops meaning anything.
- **Move the persona into a separate shared Skill.** Rejected: the agent loads a Skill, not a library,
  so another Skill's file is not readable at run time. Each Skill carries its own copy.

## Consequences

- Every Skill's text carries the voice section, and `scripts/traji-assets.test.ts` fails a pose that
  drifts from the Site's copy, a pose a Skill names but does not ship, and a shipped pose no moment
  names.
- A Skill folder grows by the poses it shows, a few kilobytes each, which the install copies with the
  rest of the folder; the folder hash in the global lock covers them like any other file.
- Refusals, warnings and bad news read plainer, because the voice is explicitly dropped there.
- The substance is unchanged: every figure is still one `traj` returned, with its as-of, and the tax
  rules are still those the CLI publishes.
