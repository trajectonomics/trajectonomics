---
status: accepted
---

# The Portal follows the Site's cookie choice

[ADR 0008](./0008-analytics-from-the-page-itself.md) gave each tab an id in `sessionStorage`, so one visit's pageviews shared a `distinct_id` and two visits never did. That id was stored for the visitor without asking them. The owner's decision on 2026-11-22 is that the Site asks before it stores any identifier ([site ADR 0024](https://github.com/trajectonomics/trajectonomics/blob/main/apps/site/docs/adr/0024-the-site-asks-before-it-sets-an-analytics-cookie.md)), and the Portal has no question of its own to ask.

## Decision

1. **The `sessionStorage` id is gone.** The Portal stores nothing, not in `sessionStorage`, `localStorage` or a cookie of its own. Storing an identifier needs the visitor's yes, and only the Site asks for it.
2. **The Portal reads the Site's choice.** The Site writes `traj_consent` and `traj_vid` with `Domain=trajectonomics.com`, so they reach `docs.trajectonomics.com` ([ADR 0013](./0013-the-portal-is-served-on-its-own-host.md)) as well as the apex, and the Portal reads them from `document.cookie`. It uses the visitor id as `distinct_id` only when `traj_consent=granted` and `traj_vid` is a strict lowercase UUID.
3. **Anyone else gets a fresh id per pageview.** A reader who never answered, refused, or set `Sec-GPC` or `DNT` is counted once per pageview with an id made for that pageview, and nothing is kept between pages.
4. **Every event says which.** Each pageview carries `consent`: `granted` or `cookieless`, the same property the Site's events carry.
5. **Nothing else changes.** The host check, the opt-out check, `$process_person_profile: false` and the Client Router pageview guard are as [ADR 0008](./0008-analytics-from-the-page-itself.md) records.

## Considered Options

- **Keep the `sessionStorage` id and add a notice to the Portal.** Rejected: a second question for the same data is worse than one question on the page that already asks, and a Portal banner would ask readers who may never see the landing page.
- **Ask on the Portal too.** Rejected for now: the owner asked for the landing page, and a reader who reaches the Portal from a search result has not seen the question yet. Asking there would make the Portal's numbers depend on which page a reader arrived at first.
- **Read the cookie through the Worker.** Rejected: the Portal's pageviews are measured in the page, and the Worker's request log says a file was fetched, not that a reader was counted.

## Consequences

- A reader who granted consent on the Site and then opens the Portal in a new tab is counted under the same id as their Site visits, which is the point of the choice.
- A reader who never granted consent is counted once per pageview. Visits can no longer be told apart, and a visit's pageviews are no longer linked. The Portal's numbers are pageview counts for those readers.
- Each pageview reads the cookies anew, so a reader who grants or refuses consent on the Site is followed on the Portal without a reload.
- The Portal does not write any cookie. A Portal change that writes one needs its own record and the visitor's consent.

## Amendment note

[ADR 0008](./0008-analytics-from-the-page-itself.md) decision 4 is superseded by this record: the `sessionStorage` id no longer exists.
