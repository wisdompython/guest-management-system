# RSVP Workflow Operations

The guest-facing RSVP prompt is **Confirm Your Attendance or Availability**.

The RSVP module is optional. Event creation now asks whether guests should confirm RSVP first or receive passes through the original direct-delivery workflow. Choosing RSVP creates a protected draft workflow immediately, so adding guests cannot accidentally send their passes before RSVP is configured. Normal delivery resumes when the workflow is completed.

## Meta templates

Create two approved WhatsApp templates before configuring a workflow.

### RSVP invitation template

- May be message-only, or use an image header when RSVP artwork is attached.
- May use the existing template variables such as guest name, event name, and event date.
- Keep the venue out of the RSVP invitation; guests receive it on the actual pass.
- Must include `rsvp_link` in `body_params` at the position of the link placeholder.
- Does not require WhatsApp quick-reply buttons.
- The application replaces `rsvp_link` with a personalised event and guest URL containing a unique six-character code, for example `https://your-domain/funke-adeyoriju-60/rsvp/rita-aivoji-A7kP4m`.
- Add `rsvp_deadline` to `body_params` wherever the approved template has a deadline placeholder. It is replaced with the workflow deadline date; workflows using it must have a response deadline.
- Previously issued `/rsvp/<uuid>` links remain valid for backward compatibility.
- Guests select Yes or No on the linked RSVP page.

### Guest-pass template

- May use an image header; the generated pass image is supplied at send time.
- May use any variables already supported by `WhatsAppTemplate.body_params`.

## Admin flow

1. Create the event and choose **Confirm RSVP first**. The RSVP setup screen opens automatically.
2. Choose the invitation and pass templates, response deadline, and automatic-pass preference.
3. Choose **Send immediately** or **Schedule for later** independently for RSVP invitations and confirmed guest passes.
4. Review the eligible recipient count. Guests without phone numbers are excluded.
5. Launch the workflow.
6. Monitor confirmed, declined, awaiting, invitation delivery, and pass delivery counts.
7. Remind awaiting guests, retry failed deliveries, or pause the workflow as required.
8. Complete the workflow after RSVP closes. Completion releases the event from the RSVP pass hold.

Guests added or imported while the workflow is a draft are attached to it automatically. The first valid Yes/No response submitted from the RSVP page is authoritative. Repeated submissions never queue another pass.

## Aso Ebi requests

Enable **Collect Aso Ebi requests** in the event's guest setup when the event offers Aso Ebi. A guest who confirms attendance can then choose whether they want Aso Ebi and must enter a quantity of at least one when they do.

The workflow dashboard shows both the number of guest requests and the total number of yards. Guests can quickly select 2, 4, 5, 6, 10, or 15 yards, or enter a custom whole number. Each request also appears in the recipient list, guest details, the regular guest CSV export, and the RSVP CSV export. For bulk guest uploads, use `aso_ebi_requested` with `yes` or `no`; when the value is `yes`, provide `aso_ebi_yards` as a whole number of at least one. The legacy `aso_ebi_quantity` heading is still accepted when importing existing files.

## RSVP artwork

An RSVP workflow can include optional PNG or JPEG artwork up to 5 MB. The artwork is the RSVP design, so it should include a guest-name space but no QR-code space. During setup, the organiser drags over the guest-name area. The system creates a personalised copy for every recipient and attaches it to the WhatsApp RSVP invitation. Use an approved WhatsApp template with an image header when artwork is attached; message-only RSVP templates continue to work without artwork. The separate guest pass design still contains the name and QR-code spaces.

## Editing and deleting

Event managers can edit or delete an RSVP workflow from either the workflow list or its dashboard. Editing is available after launch for message, artwork, deadline, and delivery-setting changes. Deleting a workflow permanently removes its recipients and RSVP responses, then returns the event to the original direct guest-pass delivery flow.

Event managers can also edit and delete WhatsApp templates from the Templates page. A template that is still attached to an event or RSVP workflow is protected from deletion; select a replacement template in those records first, then delete it.

## Pass delivery after confirmation

Automatic delivery requires an event guest-pass design and an approved WhatsApp template with an image header. RSVP invitation templates are excluded from the pass-template selector. When a confirmed guest has no stored pass image, the delivery task regenerates the QR code and personalised pass before sending. If delivery still fails, the recipient row shows the exact error and provides a Retry pass action.

## Original direct-delivery flow

Choose **Send passes directly** during event creation to keep the original workflow. Select **Send immediately** or set one default scheduled delivery date and time for the event; every newly added or imported guest inherits it. A per-guest delivery time can still override the event default.

## Daily send budget (Meta messaging tier)

Meta limits how many unique guests a WhatsApp Business number can open
business-initiated conversations with per rolling 24 hours (250 unverified,
then 1K → 10K → 100K as the tier grows). Set `WHATSAPP_DAILY_SEND_LIMIT` to
the account's current tier (default 2000).

Every dispatch path — RSVP invitations, reminders to awaiting guests,
scheduled and bulk pass sends, and event reminders — checks the trailing
24-hour send count (including messages queued but not yet sent) before
queueing more work. When the budget is exhausted:

- RSVP invitations stay approved (`queued`, no dispatch stamp) and the
  five-minute Beat dispatcher drains them automatically as the window rolls
  over. Confirmed-guest passes take priority over new invitations.
- Bulk direct sends re-schedule themselves every 30 minutes with the
  remaining guests.
- Scheduled sends and event reminders stay eligible and are picked up by
  their next Beat run.

A workflow larger than the daily tier therefore drains over multiple days
without manual intervention. Passes sent immediately after a guest replies
do not count against Meta's limit (they ride the guest's 24-hour service
window), though the budget counts them conservatively.

Practical notes for large events:

- Sending 50%+ of the tier in a week with a medium/high quality rating
  usually triggers Meta's automatic tier upgrade within 24 hours; raise
  `WHATSAPP_DAILY_SEND_LIMIT` after the upgrade is visible in the WhatsApp
  Manager.
- The Celery task rate limit (20 messages/minute) is applied per worker
  process; do not scale the `messages` queue to multiple workers without
  accounting for the multiplied throughput.
- A dispatched message that never completes (lost worker, exhausted
  retries) is re-dispatched automatically by the Beat sweep after 6 hours.

## Webhook configuration

- Keep the existing callback URL: `/api/webhooks/whatsapp/`.
- Subscribe the Meta application to WhatsApp message-status updates for invitation and pass delivery tracking.
- Set `WHATSAPP_VERIFY_TOKEN` to the token used during callback verification.
- Set `WHATSAPP_APP_SECRET` in production. When present, POST requests are verified using `X-Hub-Signature-256`.
- Ensure Celery workers and Celery Beat are running; scheduled invitations and passes are checked every five minutes and dispatched as background jobs.

## Deployment order

1. Deploy the backend code.
2. Run `python manage.py migrate` to create the RSVP tables.
3. Restart the web, Celery worker, and Celery Beat services.
4. Deploy the frontend.
5. Create the approved Meta templates in the application template registry.
6. Use a Meta test number to launch a one-recipient workflow.
7. Verify the guest link, Yes, No, duplicate submission, invitation delivery, and pass delivery behavior.
8. Enable the workflow for production guests.

## Failure recovery

- Transient WhatsApp restrictions are retried automatically. Meta sometimes
  accepts a send and later reports a failure through the status webhook.
  The five-minute dispatcher re-queues those recipients up to three times,
  and the wait matches the error: "This message was not delivered to
  maintain healthy ecosystem engagement" (Meta's per-user marketing cap,
  error 131049) is retried once per 24 hours, per Meta's guidance; quick-
  clearing errors (spam/rate limits, throughput, generic temporary
  failures) retry after 1 hour, then 4 hours, then 12 hours. Automatic
  retries spend the daily send budget like any other send.
- Permanent errors (invalid number, missing template, bad parameters) are
  never retried automatically and keep the Retry action in the recipient
  table. Manual retries preserve the attempt count and cannot bypass an
  active transient-error cooldown; the API returns the next eligible retry
  time when an operator tries too soon.
- A failed invitation can be retried from the recipient table.
- A failed pass can be retried only for a confirmed guest.
- When a single retry is blocked by a cooldown, the dashboard offers
  **Retry anyway** after a confirmation. Use it only when something has
  changed — typically the guest just messaged the business, which opens a
  service window and lifts Meta's per-user block. The override exists on
  the single-guest retry only; bulk retry always respects cooldowns.
- Several guests can be retried at once: tick the checkboxes on failed rows
  (or the header checkbox for every failed delivery on the page) and use
  **Retry invitations (n)** / **Retry passes (n)** in the selection bar.
  The endpoint (`POST /api/rsvp/recipients/bulk-retry/`) applies the same
  rules as the single retry: only failed sends are queued, and guests whose
  retryable WhatsApp error is still cooling down are skipped and reported
  back rather than blocking the rest of the selection.
- Pausing prevents queued invitation tasks from sending; resuming requeues eligible invitations.
- Completing the workflow does not delete RSVP history, guests, or the event.
