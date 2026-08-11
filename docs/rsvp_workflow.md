# RSVP Workflow Operations

The RSVP module is optional. Event creation now asks whether guests should confirm RSVP first or receive passes through the original direct-delivery workflow. Choosing RSVP creates a protected draft workflow immediately, so adding guests cannot accidentally send their passes before RSVP is configured. Normal delivery resumes when the workflow is completed.

## Meta templates

Create two approved WhatsApp templates before configuring a workflow.

### RSVP invitation template

- Must not require an image header.
- May use the existing template variables such as guest name, event name, event date, and venue.
- Must include `rsvp_link` in `body_params` at the position of the link placeholder.
- Does not require WhatsApp quick-reply buttons.
- The application replaces `rsvp_link` with a unique URL for each recipient, for example `https://your-domain/rsvp/<opaque-token>`.
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

## Original direct-delivery flow

Choose **Send passes directly** during event creation to keep the original workflow. Select **Send immediately** or set one default scheduled delivery date and time for the event; every newly added or imported guest inherits it. A per-guest delivery time can still override the event default.

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

- A failed invitation can be retried from the recipient table.
- A failed pass can be retried only for a confirmed guest.
- Pausing prevents queued invitation tasks from sending; resuming requeues eligible invitations.
- Completing the workflow does not delete RSVP history, guests, or the event.
