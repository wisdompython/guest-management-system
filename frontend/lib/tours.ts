import { Tour } from '@/components/tour/TourProvider'

export const TOURS: Tour[] = [
  {
    id: 'events',
    steps: [
      { target: 'nav-events', path: '/admin/events', title: 'Start at Events', body: 'This is where every event for your organization lives.', placement: 'right' },
      { target: 'events-new-button', path: '/admin/events', title: 'Create an event', body: 'Click "+ New Event" to set up a name, date, and venue.', placement: 'left' },
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
