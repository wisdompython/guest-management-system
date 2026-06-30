import { Tour } from '@/components/tour/TourProvider'

export const TOURS: Tour[] = [
  {
    id: 'events',
    steps: [
      { target: 'nav-events',                  path: '/admin/events',     title: 'Start at Events',              body: 'This is where every event for your organization lives. You can see all events, their guest counts, and check-in progress at a glance.',                                                                                                    placement: 'right'  },
      { target: 'events-new-button',            path: '/admin/events',     title: 'Create a new event',           body: 'Click "+ New Event" to open the event creation form.',                                                                                                                                                                                  placement: 'left'   },
      { target: 'event-details-section',        path: '/admin/events/add', title: 'Event Details',                body: 'Start with the basics — give your event a name, set the date & time, and optionally add a venue.',                                                                                                                                       placement: 'bottom' },
      { target: 'event-name-field',             path: '/admin/events/add', title: 'Event Name',                   body: 'Enter a clear name for the event (e.g. "Annual Gala 2026"). This appears on the guest pass and in WhatsApp messages.',                                                                                                                   placement: 'bottom' },
      { target: 'event-date-field',             path: '/admin/events/add', title: 'Date & Time',                  body: 'Must be a future date. The event date is used to auto-trigger reminders at the right time before the event.',                                                                                                                            placement: 'bottom' },
      { target: 'event-pass-design-section',    path: '/admin/events/add', title: 'Pass Design & Zones',          body: 'Upload a PNG or JPG design template for the guest pass — this is the background image printed or shown digitally to each guest.',                                                                                                        placement: 'bottom' },
      { target: 'event-design-upload',          path: '/admin/events/add', title: 'Upload your design',           body: 'Choose a PNG or JPG. Once uploaded, the canvas below lets you draw where the QR code and guest name should appear on the design.',                                                                                                       placement: 'bottom' },
      { target: 'event-zone-canvas',            path: '/admin/events/add', title: 'Mark QR & Name zones',         body: 'After uploading, switch between "Draw QR Zone" and "Draw Name Zone" tabs and drag on the image to mark each area. The purple box = QR code, green box = guest name.',                                                                    placement: 'top'    },
      { target: 'event-guest-config-section',   path: '/admin/events/add', title: 'Guest Configuration',          body: 'Define ticket types (General, VIP, VVIP), required fields for registration, and WhatsApp delivery settings.',                                                                                                                           placement: 'bottom' },
      { target: 'event-whatsapp-toggle',        path: '/admin/events/add', title: 'WhatsApp Delivery',            body: 'Toggle this on to enable WhatsApp pass delivery for this event. When on, phone number becomes mandatory for every guest.',                                                                                                               placement: 'top'    },
      { target: 'event-whatsapp-template',      path: '/admin/events/add', title: 'WhatsApp Template',            body: 'Pick which approved Meta template to use when sending passes for this event. Leave it on the default if you haven\'t set up a specific template for this event.',                                                                         placement: 'top'    },
      { target: 'event-typography-section',     path: '/admin/events/add', title: 'Name Typography',              body: 'Control how the guest\'s name is rendered on the pass — choose a font, set the colour, and adjust the size. This only takes effect if you\'ve drawn a name zone.',                                                                       placement: 'top'    },
      { target: 'event-submit-button',          path: '/admin/events/add', title: 'Create the event',             body: 'Once everything looks good, click "Create Event". You\'ll be taken back to the events list where your new event will appear.',                                                                                                          placement: 'top'    },
    ],
  },
  {
    id: 'fonts',
    steps: [
      { target: 'nav-fonts',            path: '/admin/fonts', title: 'Pass Designer',       body: 'The Pass Designer is where you manage your font library and preview how guest passes will look for each event.',                                                                                        placement: 'right'  },
      { target: 'fonts-upload-section', path: '/admin/fonts', title: 'Upload a font',       body: 'Upload a .ttf or .otf font file here. Uploaded fonts become available in the Name Typography panel when creating or editing events.',                                                                   placement: 'bottom' },
      { target: 'fonts-drop-zone',      path: '/admin/fonts', title: 'Drop zone',           body: 'Drag a font file directly here, or click to open the file picker. Only .ttf and .otf formats are supported.',                                                                                          placement: 'right'  },
      { target: 'fonts-name-input',     path: '/admin/fonts', title: 'Font name',           body: 'Give the font a friendly display name. The name fills in automatically from the filename, but you can change it to anything you like.',                                                                 placement: 'right'  },
      { target: 'fonts-upload-button',  path: '/admin/fonts', title: 'Upload',              body: 'Click "Upload Font" to save the font to your library. It will appear instantly in the library panel below and in the event typography settings.',                                                       placement: 'right'  },
      { target: 'fonts-library',        path: '/admin/fonts', title: 'Font library',        body: 'All uploaded fonts appear here with a live preview using the actual typeface. Click any font to set it as the active font for the selected event.',                                                     placement: 'right'  },
      { target: 'fonts-preview-panel',  path: '/admin/fonts', title: 'Pass preview',        body: 'The right panel shows a live preview of the selected event\'s pass template, including the QR and name zone positions and typography settings. Switch the event using the dropdown in the top bar.',   placement: 'left'   },
    ],
  },
  {
    id: 'guests',
    steps: [
      { target: 'nav-guests',              path: '/admin/guests',             title: 'Open Guests',           body: 'The Guests section is where you manage everyone attending your events. You can add guests one at a time or bulk-upload an entire spreadsheet.',                                                          placement: 'right'  },
      { target: 'guests-search-link',      path: '/admin/guests',             title: 'Search across events',  body: 'Need to find a specific guest quickly? Use "Search all" to look up any guest by name or phone number, across every event.',                                                                            placement: 'bottom' },
      { target: 'guests-pick-event',       path: '/admin/guests',             title: 'Select an event',       body: 'Click an event card to open its guest list. Each event has its own guest list, so you select the event first.',                                                                                        placement: 'right'  },
      { target: 'guests-add-button',       path: '/admin/guests',             title: 'Add a single guest',    body: 'Click "+ Add Guest" to open the single guest form. Good for adding a VIP or a last-minute attendee.',                                                                                                  placement: 'left'   },
      { target: 'guests-bulk-upload-button', path: '/admin/guests',           title: 'Bulk upload',           body: 'Have a spreadsheet of guests? Click "Bulk Upload" to import them all at once with a CSV file.',                                                                                                        placement: 'left'   },
      { target: 'guest-form-header',       path: '/admin/guests/add',         title: 'Guest form',            body: 'Fill in the guest\'s details here. Only Full Name is always required — the rest depends on what you configured for the event.',                                                                        placement: 'bottom' },
      { target: 'guest-name-field',        path: '/admin/guests/add',         title: 'Full name',             body: 'Enter the guest\'s full name exactly as you want it printed on the pass.',                                                                                                                            placement: 'bottom' },
      { target: 'guest-event-select',      path: '/admin/guests/add',         title: 'Assign to an event',    body: 'Select which event this guest is attending. The form will update to show any additional required fields for that event.',                                                                              placement: 'bottom' },
      { target: 'guest-submit-button',     path: '/admin/guests/add',         title: 'Save the guest',        body: 'Click "Add Guest" to save. The guest gets a unique QR code automatically — you can then send them their pass via WhatsApp.',                                                                          placement: 'top'    },
      { target: 'bulk-upload-header',      path: '/admin/guests/bulk-upload', title: 'Bulk upload form',      body: 'To import many guests at once, use this form. Download a template CSV, fill it in, and upload it here.',                                                                                              placement: 'bottom' },
      { target: 'bulk-event-select',       path: '/admin/guests/bulk-upload', title: 'Pick the event',        body: 'Select the event first — the required columns update based on that event\'s settings (e.g. phone_number becomes required when WhatsApp is on).',                                                      placement: 'bottom' },
      { target: 'bulk-csv-input',          path: '/admin/guests/bulk-upload', title: 'Choose your CSV',       body: 'Your CSV must have a header row with the column names shown above. Extra columns are ignored. You can use Excel or Google Sheets, just export as CSV.',                                               placement: 'bottom' },
      { target: 'bulk-submit-button',      path: '/admin/guests/bulk-upload', title: 'Upload',                body: 'Click "Upload Guests" to start the import. A results summary will appear below showing how many guests were added and any rows that had errors.',                                                      placement: 'top'    },
    ],
  },
  {
    id: 'checkin',
    steps: [
      { target: 'nav-checkin',    path: '/admin/check-in', title: 'Scanner stations',      body: 'The Scanner Station is designed for door staff at the event. Open this on a phone or tablet and use it to scan guest QR codes as they arrive.',                                                          placement: 'right'  },
      { target: 'checkin-title',  path: '/admin/check-in', title: 'QR Check-In',           body: 'This screen uses your device camera to scan QR codes. Point the camera at a guest\'s pass and it will check them in instantly.',                                                                         placement: 'bottom' },
      { target: 'checkin-camera', path: '/admin/check-in', title: 'Camera viewfinder',     body: 'The camera starts automatically. Align the guest\'s QR code inside the bracket — it detects and looks up the guest in under a second.',                                                                  placement: 'bottom' },
      { target: 'nav-dashboard',  path: '/admin/check-in', title: 'Watch arrivals live',   body: 'While the scanner is running at the door, the Dashboard shows a live feed of check-ins and attendance stats. Open it on a separate screen to monitor the event in real time.',                           placement: 'right'  },
    ],
  },
  {
    id: 'whatsapp',
    steps: [
      { target: 'nav-whatsapp',          path: '/admin/whatsapp', title: 'Open WhatsApp',        body: 'The WhatsApp section lets you send each guest their personalized pass via WhatsApp. You can send individually or to everyone at once.',                                                              placement: 'right'  },
      { target: 'whatsapp-title',        path: '/admin/whatsapp', title: 'Pick an event',         body: 'Select the event whose guests you want to message. The table shows how many have been sent already.',                                                                                               placement: 'bottom' },
      { target: 'whatsapp-event-table',  path: '/admin/whatsapp', title: 'Event list',            body: 'Click any row to open that event\'s guest list. You\'ll see each guest\'s send status — not sent, delivering, or sent with a timestamp.',                                                          placement: 'bottom' },
      { target: 'whatsapp-bulk-actions', path: '/admin/whatsapp', title: 'Bulk send',             body: '"Send to X unsent" queues passes for all guests who haven\'t received one yet. "Resend all" re-sends to everyone. A confirmation modal shows you who will receive a message before you confirm.', placement: 'bottom' },
      { target: 'nav-reminders',         path: '/admin/whatsapp', title: 'Automatic reminders',   body: 'Under Reminders, you can schedule automatic messages (e.g. "1 day before the event") that fire without you having to come back.',                                                                  placement: 'right'  },
      { target: 'reminders-title',       path: '/admin/reminders', title: 'Reminders page',       body: 'Each event can have its own reminder schedule. Reminders are sent via the same WhatsApp template, just triggered at a set time before the event date.',                                            placement: 'bottom' },
      { target: 'reminders-configure-button', path: '/admin/reminders', title: 'Configure',       body: 'Click "Configure →" next to any event to set up its reminder schedule — choose how many hours or days before the event each reminder fires.',                                                     placement: 'left'   },
    ],
  },
  {
    id: 'templates',
    steps: [
      { target: 'nav-templates',         path: '/admin/settings/templates', title: 'WhatsApp Templates',   body: 'Templates are the approved message formats Meta requires before you can send WhatsApp messages at scale. You manage them here.',                                                           placement: 'right'  },
      { target: 'templates-add-button',  path: '/admin/settings/templates', title: 'Add a template',       body: 'Click here to create a new template. Use {{1}}, {{2}}, etc. as placeholders — they\'re filled in per guest when the message is sent (e.g. {{1}} becomes the guest\'s name).',           placement: 'left'   },
    ],
  },
  {
    id: 'team',
    steps: [
      { target: 'nav-team',             path: '/admin/users', title: 'Manage your team',    body: 'The Team section lets you invite other people to the platform and control what they can see and do.',                                                                                                     placement: 'right'  },
      { target: 'team-new-user-button', path: '/admin/users', title: 'Invite a teammate',   body: 'Click "+ New User" to invite someone by email. Assign them one of three roles: Viewer (read-only), Event Manager (can manage events and guests), or Super Admin (full access).',                       placement: 'left'   },
    ],
  },
]

export function getTour(id: string): Tour | undefined {
  return TOURS.find((t) => t.id === id)
}
