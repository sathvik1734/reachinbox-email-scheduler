# Five-minute demo script

## 0:00–0:35 — Architecture

- Show the repository folders and `docker-compose.yml`.
- Say: “The API persists campaigns in PostgreSQL, schedules deterministic delayed jobs in BullMQ, and a separate worker sends through Ethereal.”

## 0:35–1:20 — Google login and dashboard

- Start on the login page and use real Google OAuth.
- Point out the signed-in user’s name, email, avatar, and logout control.
- Briefly show the Scheduled and Sent tabs and their empty/loading states.

## 1:20–2:30 — Schedule a campaign

- Click **Compose new email**.
- Use your Google email as the sender.
- Enter a subject and body.
- Upload `sample-leads.csv`; show that three unique addresses are detected.
- Set the start time two minutes ahead, delay to 2 seconds, and hourly limit to 2.
- Schedule the campaign and show the rows in Scheduled Emails.

## 2:30–3:35 — Persistence through restart

- Before the scheduled time, stop both API and worker (`Ctrl+C` if running locally, or stop the `api` and `worker` containers).
- Leave PostgreSQL and Redis running so their persisted volumes remain available.
- Start API and worker again.
- Explain: “BullMQ delayed jobs remained in Redis. Startup reconciliation also checks QUEUED/SCHEDULED database rows using deterministic job IDs, so partial DB/queue writes are repaired without duplicates.”
- Refresh the dashboard and show the same future rows—not a newly created campaign.

## 3:35–4:30 — Delivery and throttling

- Let the first two emails send and open their Ethereal Preview links from Sent Emails.
- Show that the third email stays scheduled because the per-sender hourly limit is two.
- For a shorter recording, temporarily set `MAX_EMAILS_PER_HOUR_PER_SENDER=2` and explain that the deferred row is moved to the next hour rather than dropped.
- Point out the two-second gap enforced by the BullMQ worker limiter.

## 4:30–5:00 — Code highlights

- Show `backend/src/worker.ts` for concurrency, at-most-once claiming, and deferral.
- Show `backend/src/services/rateLimiter.ts` for the atomic Redis Lua counter.
- Show `backend/src/queue/emailQueue.ts` for deterministic job IDs and startup recovery.
- End with the README architecture and trade-offs section.

## Recording tip

Keep terminals zoomed in, avoid exposing `.env`, and prepare the Google and Ethereal accounts before recording.
