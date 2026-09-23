# Mata v5

Mata has two explicit modes. Local mode keeps the existing offline parser and record editor. Advanced mode uses an authenticated planning endpoint and read-only tools, then submits proposed operations to the existing validated preview/commit layer. A model response never writes records directly.

## Deployment and activation

`supabase/functions/mata-planner/index.ts` is deployed as `mata-planner` with JWT verification enabled. It also verifies the current user using `auth.getUser()`. No service-role key is used and no RLS policies are changed.

Configure **MATA_OPENAI_API_KEY** and **MATA_OPENAI_MODEL** in the project's Supabase Edge Function secrets. Use a model supporting Chat Completions function calling. Do not put the key in GitHub, browser JavaScript or chat. Configure the provider project's budget/rate limits before enabling usage. The endpoint has per-isolate burst protection (not a global billing cap), 220 KB requests, 3,000 output tokens and 45-second timeouts; the client stops after eight read/planning rounds.

Users sign in, opt into “Gelişmiş dil anlama”, and check the connection. A status check does not call the provider or send study records. Once opted in, the last 12 chat messages, app context and the requested records can be sent to OpenAI. Disabling the option stops subsequent calls; already submitted requests cannot be recalled. No credential collection happens in Mata. `store:false` is set for completion requests; this is not a claim of zero provider retention.

## Capabilities

| Surface | Mata access |
|---|---|
| Blocks, untimed cards, tasks, debts, questions, exams | Full field reads, paginated search, existing validated add/edit/delete/status/duplicate/schedule operations |
| Analyses | Model can read relevant records and compare/explain them; local analyses remain available |
| Settings | Plan mode and week start, previewed and persisted |
| Timer | Read, start, pause, resume, stop, +5 minutes, acknowledge |
| Accounts | Read own display/sync status, open native login/register, sync, confirmed logout |
| Backup | Download current state after preview |
| Restore/reset | Open native settings; user picks file or confirms deletion there |
| YKS | Validated correct/wrong + OBP calculation; program search, year-specific base ranks, check/cross comparison |
| Navigation/Bridge | Open existing app screen, including native ChatGPT Bridge |

Scope limits: YKS remains the app's approximate SAY model, not official exact ranks or guaranteed admission. Other users' private records and admin powers are not granted to Mata. Model keys are required to activate semantic language understanding; local mode alone does not provide it. No success claim should be made for an inactive model or an operation that only opened a form.

## Verification

Run `node --test tests/*.test.cjs`. The platform tests cover pagination, no unapproved model writes, stable record IDs, unread targets, account changes, settings/timer races, operation allowlists, and YKS input validation. The original suites cover record reducers, linked debts, tombstones, CAS persistence, conversations and cache versions. Real provider end-to-end evaluation requires configured credentials and an opted-in test account.
