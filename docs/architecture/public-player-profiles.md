# Public player profiles

`GET /api/v1/public/players/{id}` exposes an explicit allowlist: UUID, current nickname, current skin revision, registration date and affiliations with `ACTIVE` states. Existing profiles remain addressable after a nickname change. Account status, roles, credentials, sessions, login timestamps and private state data are not part of this DTO.

Citizenships use open membership intervals. Founder labels follow the primary founder and the cofounders in the current governance revision. Office names are hydrated through normalized localized texts; current office holders must satisfy the same term authority checks as the public state reader. Removed offices and historical holders do not appear. A read-only repeatable-read transaction keeps names and affiliations consistent.

Vega renders `/players/$playerId` through a public server loader with omitted credentials. Profile content and localized metadata are present without JavaScript. Invalid or missing UUIDs produce a not-found page; service failures use the existing error page. Empty affiliations have a useful link to the state directory. No live game statistics are fabricated.

`PlayerNickname` links to profiles by default in Vega. Atria accepts the application-owned URL through `href`; `linked={false}` in Vega avoids nested interactions in buttons and checkbox labels. Gallery author links sit outside the gallery item link. Generated constitution names link to the same UUID profiles through sanitized Markdown.
