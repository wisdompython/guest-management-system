# Optional WhatsApp RSVP Workflow

This checklist tracks the implementation of the isolated RSVP feature.

## Isolation contract

- [x] Events without an active RSVP workflow behave exactly as they do today.
- [x] RSVP data lives in the standalone `rsvp` Django app.
- [x] No RSVP fields are added to the existing `Event` or `Guest` tables.
- [x] Shared code is limited to URL registration, navigation, webhook routing, and a guard that holds automatic pass delivery for active RSVP workflows.
- [x] Disabling or deleting an RSVP workflow never deletes its event or guests.

## Phase 1 — Foundation

- [x] Register the `rsvp` Django app and API namespace.
- [x] Add `RsvpWorkflow` for event-level configuration.
- [x] Add `RsvpRecipient` for per-guest RSVP and delivery state.
- [x] Add `RsvpResponse` for idempotent response history and auditing.
- [x] Create and verify the initial migration.
- [x] Register RSVP records in Django admin.

## Phase 2 — Workflow API

- [x] List, create, retrieve, update, and delete RSVP workflows.
- [x] Prevent more than one workflow from being attached to an event.
- [x] Populate recipients from selected guests or all eligible event guests.
- [x] Return confirmed, declined, awaiting, invitation, and pass statistics.
- [x] Add recipient search and status filters.
- [x] Add workflow launch, pause, resume, and complete actions.
- [x] Allow RSVP invitations to be scheduled for a later date and time.
- [x] Allow confirmed guest passes to be scheduled independently of RSVP responses.
- [x] Add reminder action for awaiting recipients.
- [x] Enforce event-manager permissions for mutations.

## Phase 3 — WhatsApp integration

- [x] Send the approved RSVP template with a guest-specific RSVP link.
- [x] Use an opaque per-recipient URL token.
- [x] Record the outbound WhatsApp message ID.
- [x] Validate Meta webhook signatures.
- [x] Expose a public token-protected RSVP details and response endpoint.
- [x] Process repeated RSVP-page submissions idempotently.
- [x] Mark page submissions of Yes as confirmed and No as declined.
- [x] Queue exactly one guest pass when a recipient confirms.
- [x] Track invitation and pass delivery failures separately.
- [x] Keep non-RSVP inbound WhatsApp behavior unchanged.

## Phase 4 — Automatic-pass isolation

- [x] Hold normal automatic pass delivery when an event has an active RSVP workflow.
- [x] Continue generating QR codes and pass images while delivery is held.
- [x] Preserve the existing automatic send for every event without an active workflow.
- [x] Add an event-level default pass schedule to the original direct-delivery workflow.
- [x] Allow manual recovery for failed confirmed-pass deliveries.

## Phase 5 — Admin interface

- [x] Add a separate **RSVP Workflows** navigation entry.
- [x] Build the workflow list with draft/active/paused/completed states.
- [x] Build the three-step setup wizard.
- [x] Ask for RSVP-first or direct delivery during event creation and reserve RSVP safely.
- [x] Preview the selected RSVP template and guest-specific link.
- [x] Build the public guest RSVP page with Yes/No response states.
- [x] Show the recipient count before launch.
- [x] Build the workflow dashboard and response progress display.
- [x] Build the recipient table with response and delivery filters.
- [x] Add export controls.
- [x] Add reminder, pause/resume, and retry controls.
- [x] Add responsive and empty states.

## Phase 6 — Verification

- [x] Test workflow validation and recipient uniqueness.
- [x] Test event isolation and pass-hold behavior.
- [x] Test public-page Yes, No, duplicate, invalid, and expired submissions.
- [x] Test exactly-once pass queueing.
- [x] Test aggregate statistics and filters.
- [ ] Run all existing backend tests.
- [x] Run frontend type checks and production build.
- [ ] Verify the flow against a Meta test number and approved template.

## Phase 7 — Deployment and handoff

- [x] Document the required Meta template and `rsvp_link` placeholder.
- [x] Document environment variables and webhook configuration.
- [x] Document the launch, reminder, pause, and completion operations.
- [ ] Apply migrations and deploy workers before enabling the UI.
- [ ] Complete a production smoke test without sending to real guests.

## Definition of done

- An event manager can create and launch an optional RSVP workflow.
- Yes/No replies update the correct recipient exactly once.
- A confirmed recipient receives one pass when automatic delivery is enabled.
- The dashboard accurately reports invited, confirmed, declined, awaiting, and pass delivery counts.
- Events without RSVP workflows pass regression tests with no behavioral change.
