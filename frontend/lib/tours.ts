import { Tour } from '@/components/tour/TourProvider'

export const TOURS: Tour[] = [
  {
    id: 'events',
    steps: [
      { target: 'nav-events',             path: '/admin/events',     title: 'Start at Events',         body: 'This is where every event for your organization lives. You can see all events, their guest counts, and check-in progress at a glance.',                                    placement: 'right' },
      { target: 'events-new-button',      path: '/admin/events',     title: 'Create a new event',      body: 'Click "+ New Event" to open the event creation form.',                                                                                                                  placement: 'left'  },
      { target: 'event-details-section',  path: '/admin/events/add', title: 'Event Details',           body: 'Start with the basics — give your event a name, set the date & time, and optionally add a venue.',                                                                      placement: 'bottom' },
      { target: 'event-name-field',       path: '/admin/events/add', title: 'Event Name',              body: 'Enter a clear name for the event (e.g. "Annual Gala 2026"). This appears on the guest pass and in WhatsApp messages.',                                                  placement: 'bottom' },
      { target: 'event-date-field',       path: '/admin/events/add', title: 'Date & Time',             body: 'Must be a future date. The event date is used to auto-trigger reminders at the right time before the event.',                                                           placement: 'bottom' },
      { target: 'event-pass-design-section', path: '/admin/events/add', title: 'Pass Design & Zones', body: 'Upload a PNG or JPG design template for the guest pass — this is the background image printed or shown digitally to each guest.',                                        placement: 'bottom' },
      { target: 'event-design-upload',    path: '/admin/events/add', title: 'Upload your design',      body: 'Choose a PNG or JPG. Once uploaded, the canvas below lets you draw where the QR code and guest name should appear on the design.',                                      placement: 'bottom' },
      { target: 'event-zone-canvas',      path: '/admin/events/add', title: 'Mark QR & Name zones',   body: 'After uploading, switch between "Draw QR Zone" and "Draw Name Zone" tabs and drag on the image to mark each area. The purple box = QR code, green box = guest name.',   placement: 'top'   },
      { target: 'event-guest-config-section', path: '/admin/events/add', title: 'Guest Configuration', body: 'Define ticket types (General, VIP, VVIP), required fields for registration, and WhatsApp delivery settings.',                                                          placement: 'bottom' },
      { target: 'event-whatsapp-toggle',  path: '/admin/events/add', title: 'WhatsApp Delivery',       body: 'Toggle this on to enable WhatsApp pass delivery for this event. When on, phone number becomes mandatory for every guest.',                                              placement: 'top'   },
      { target: 'event-whatsapp-template', path: '/admin/events/add', title: 'WhatsApp Template',     body: 'Pick which approved Meta template to use when sending passes for this event. Leave it on the default if you haven\'t set up a specific template for this event.',        placement: 'top'   },
      { target: 'event-typography-section', path: '/admin/events/add', title: 'Name Typography',      body: 'Control how the guest\'s name is rendered on the pass — choose a font, set the colour, and adjust the size. This only takes effect if you\'ve drawn a name zone.',      placement: 'top'   },
      { target: 'event-submit-button',    path: '/admin/events/add', title: 'Create the event',        body: 'Once everything looks good, click "Create Event". You\'ll be taken back to the events list where your new event will appear.',                                          placement: 'top'   },
    ],
  },
  {
    id: 'guests',
    steps: [
      { target: 'nav-guests', path: '/admin/guests', title: 'Open Guests', body: 'Guests are managed per event. Pick an event first.', placement: 'right' },
      { target: 'guests-search-link', path: '/admin/guests', title: 'Search across events', body: 'Use "Search all" to find any guest by name or phone, across every event.', placement: 'bottom' },
      { target: 'guests-pick-event', path: '/admin/guests', title: 'Select an event', body: 'Click an event card to open its guest list. From there you can add guests one at a time or bulk-upload a CSV.', placement: 'right' },
    ],
  },
  {
    id: 'checkin',
    steps: [
      { target: 'nav-checkin', path: '/admin/check-in', title: 'Scanner stations', body: 'This screen is built for the door — scan each guest pass QR code here to check them in.', placement: 'right' },
      { target: 'nav-dashboard', path: '/admin/check-in', title: 'Watch arrivals live', body: 'The Dashboard shows a live feed of check-ins and attendance stats as they happen.', placement: 'right' },
    ],
  },
  {
    id: 'whatsapp',
    steps: [
      { target: 'nav-whatsapp', path: '/admin/whatsapp', title: 'Open WhatsApp', body: 'Send guest passes and messages directly over WhatsApp.', placement: 'right' },
      { target: 'nav-reminders', path: '/admin/whatsapp', title: 'Automatic reminders', body: 'Set up scheduled reminders (e.g. "1 day before") under Reminders.', placement: 'right' },
    ],
  },
  {
    id: 'templates',
    steps: [
      { target: 'nav-templates', path: '/admin/settings/templates', title: 'WhatsApp Templates', body: 'Templates must be approved in Meta Business before they can message guests.', placement: 'right' },
      { target: 'templates-add-button', path: '/admin/settings/templates', title: 'Add a template', body: 'Use {{1}}, {{2}}, etc. as placeholders — filled in per guest when sent.', placement: 'left' },
    ],
  },
  {
    id: 'team',
    steps: [
      { target: 'nav-team', path: '/admin/users', title: 'Manage your team', body: 'Invite teammates and assign roles to control what they can see and do.', placement: 'right' },
      { target: 'team-new-user-button', path: '/admin/users', title: 'Invite a teammate', body: 'Click "+ New User" and pick a role: Viewer, Event Manager, or Super Admin.', placement: 'left' },
    ],
  },
]

export function getTour(id: string): Tour | undefined {
  return TOURS.find((t) => t.id === id)
}
