---
status: superseded in part by 0035
---

# The hero carries one app window, and the page loses How it works

The owner did not like the hero. Their brief, on 2026-11-21: copy the structure of twenty.com's hero, where the only
difference is the demo; do not show the two chats at the same time, because a visitor cannot keep track of both, so
play the old way first and the new way after it finishes, as the phone already does; make the widget as wide as the
section, like twenty's app; show the whole Claude app, interactive, where a visitor first sees a user type in one chat
without the skills and get a bad answer, then press New chat, type with the skills and get a result like the After
panel; and remove the whole How it works section.

## Decision

- **The hero has twenty.com's structure.** The release pill, the headline, the subline and two buttons, then one wide
  window under them. The two buttons are the Copy control (filled) and the way out (outlined), side by side and both
  bevelled at the bottom right ([ADR 0007](./0007-landing-page-restyle-twenty-language.md)); the card around them, and
  the breathing ring that said "press here", are gone, because the window now has the one control that asks to be
  pressed. The window is at most 64 rem (1,024 px) wide, the stage's 67 rem less its gutters, so it runs wider than
  the copy above it. The pixel field is the ground of the whole stage, copy and window: it gathers at the top and runs
  down the two sides of the window, as twenty's does, and it keeps its clearing behind the copy
  ([ADR 0014](./0014-the-hero-field-leaves-the-centre-and-the-headline-is-regular.md)), so the rim check that the
  copy sits on clean ground still holds ([ADR 0017](./0017-the-hero-rim-brightens-the-field-outside-the-copy.md)).
- **The window is a drawn picture of the app a visitor's agent runs in.** A title bar named `Claude`, a sidebar with
  New chat and the chats it lists, and a main pane: the chat's title, a tag that says whether the agent had the skill, the
  transcript, the verdict, and a composer. It is markup and CSS in the Site's own tokens, with no screenshot, no embed
  and no mark of anyone else's, and the name and the skill's command are the two constants `DEMO_APP_NAME` and
  `DEMO_SKILL_COMMAND`. No claim is made that the Site integrates with that app.
- **Two chats, one on screen, in turn.** The window opens on the agent alone: the question is typed into the composer,
  sent, and the exchange of [ADR 0019](./0019-the-sections-motion-plays-once-on-entry.md) plays out to the
  confession and its verdict. The window then asks for New chat to be pressed (the button pulses for `HINT_MS`, 2.5 s),
  and presses it: the chat with the skill plays, with `/traj` typed ahead of the same question, and ends on the answer.
  The timeline module gained one idea, a lead, so each chat's first message lands when its typed prompt is sent
  (`typing()`, `sequenceTimeline(…, leadMs)`), and the choreography stays data.
- **Interactive means the sidebar, not the composer.** New chat, the two chats in Recents and Replay are real
  buttons: New chat plays the chat with the skill now, a chat in Recents opens settled, Replay starts again. The
  composer is a picture of the app's input, `aria-hidden` and not an `input`: the Site has no model to answer a
  visitor's own words, and a field that appeared to take them would promise one.
- **The static state is still the whole story ([ADR 0019](./0019-the-sections-motion-plays-once-on-entry.md)).** With
  no script, or with motion reduced, the window sets no stage: both chats stand whole, one above the other, with
  their verdicts, the composers are not drawn, the sidebar is out of the reading order and every button ships
  `disabled` (Replay ships `hidden`), so no control is offered that cannot work. The Reveal layer does nothing at all
  under reduced motion, so the accessibility check, which runs reduced, still judges both transcripts.
- **In motion the window holds one height and one chat.** The Reveal layer sets `data-stage` on the window and marks the
  chat that plays `wait` until the window's head is on screen, then `play`, and takes the mark off when the chat ends,
  so the settled chat is the static chat. A transcript scrolls inside the window, follows its newest message, and is a
  Tab stop with a focus ring (a scroll region a keyboard cannot reach is an axe violation). On a phone the sidebar becomes a strip above the
  chat. The script is one inline script of 2,107 bytes where the one it replaces was 2,301; the page's Program
  JavaScript is 9,196 of the 10,000 ([ADR 0005](./0005-page-weight-and-web-font-budget.md)).
- **How it works is gone.** The section, its steps, its two layers and its three drawn outputs, the flow's timeline and the
  stylesheets and browser checks that drove them, the Dictionary's `how*` strings and the two links under it
  (`starOnboarding`, `cliDocsLink`), and the section's part of `llms-full.txt`. The skills repository's link the
  link check named moves to the footer's own `Skills on GitHub`, which already carries it. The page is now the
  header, the hero with the window, Features, and the footer. The layer argument the section made is still said in
  the Features and in the demo, where the agent loads the skill, runs the CLI and reads the figure back.
- **The chat's own rules stand.** The page's one `h1` and its `h2`s ([ADR 0012](./0012-one-h2-per-section.md)), the
  demo output that wraps and is not a scroll container ([ADR 0021](./0021-the-browser-checks-judge-a-phone-and-the-demo-output-wraps.md)),
  the gate that is a media query and not the kill switch, and the reading pace of a message and of a CLI line.

## Considered Options

- **Keep the two panels and show them one at a time on every screen.** Rejected: that is what the phone did, and the
  owner's complaint was the pair itself; a window carries the idea with one chat and one place to look.
- **A tab bar or a Before/After switch above the chats.** Rejected for the reason [ADR 0019](./0019-the-sections-motion-plays-once-on-entry.md)'s
  amendment gave about the phone's tab bar: a second thing to press before anything is read. New chat is the app's
  own control and is the story's own step.
- **A composer that really takes the visitor's words.** Rejected: there is no model behind it, and answering with a
  canned line would teach a visitor that traj chats.
- **A screenshot or recording of the real app.** Rejected: it is a third party's interface in a file the Site cannot
  localize, cannot keep still for reduced motion and cannot let a visitor click.
- **A fake pointer that moves to New chat and presses it.** Rejected: it costs script bytes the page does not have,
  and the pulse says the same thing.
- **Start the first chat as soon as the page loads.** Rejected: a window that is below the fold would play to nobody.
  The chat starts when the window's head is 120 px inside the screen's foot, which is at the landing view on a
  laptop and a phone alike, and the first frame is held until then.
- **Keep How it works below the hero.** Rejected by the owner.

## Consequences

- This record supersedes the part of [ADR 0019](./0019-the-sections-motion-plays-once-on-entry.md) that was about two
  compare panels, the phone's one-panel stage and the control slot under them, and the layer flow with its one named
  layout animation: the Site now has none, so the rule that the page only ever animates `opacity` and `transform`
  has no exception. The rest of that record stands, and a chat still plays once on its own: it plays again only on
  the visitor's New chat or Replay.
- The six committed visual baselines and the twelve `docs/screenshots/site-<language>-<width>-<scheme>.png` renders
  change, and only because the page did.
- The Thai strings the window adds (`appNewChat`, `appRecents`, `appTitleWithout`, `appTitleWith`, `appPlaceholder`)
  are first drafts, and no Thai speaker has read them.
- `FOCUSABLE` in `e2e/pages.ts` counts a `tabindex="0"` stop, because the keyboard check must count the transcript.
- The ripple ignores a click inside the window, as it ignores one on a control.
- The hero's own load-in (the copy rising in four steps of 80 ms) is now declared only under `no-preference`, as
  [ADR 0019](./0019-the-sections-motion-plays-once-on-entry.md) already requires of every delayed beat. The kill
  switch zeroes a duration and leaves a delay alone, so under `reduce` the subline and the buttons waited, invisible,
  up to 240 ms, and a capture taken then showed the headline, a blank gap the height of the missing copy, and the
  window. A visitor who asks for less motion now gets the copy on the first frame.
