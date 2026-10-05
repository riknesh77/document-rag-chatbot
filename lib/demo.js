const { randomUUID } = require('node:crypto');
const { getDb } = require('./db');
const DEMO_TEXT = `Campus Repair Hub — Pilot Project Brief

The student affairs team needs a web portal to report broken equipment in campus study rooms.
Students must be able to submit a repair ticket with the room number, equipment type and issue description.
Each student must be able to view only their own tickets and track the repair status.
The pilot must include a staff dashboard for assigning tickets to technicians.
The portal must work on mobile phones and desktop browsers.
The team must deliver a working public deployment and a GitHub repository by 30 November 2026.
The final presentation must include a three-minute demonstration and a seven-slide pitch deck.
Success will be measured by a 30 percent reduction in unresolved tickets after four weeks.
Email notifications are optional for the pilot. Payment processing is outside the project scope.
The pilot budget is RM 2,000. Personal student data must never be visible in the public dashboard.`;
const DEMO_REQUIREMENTS = [
  ['Submit repair tickets', 'Feature', 'Students must be able to submit a repair ticket with the room number, equipment type and issue description.'],
  ['Protect each student’s tickets', 'Constraint', 'Each student must be able to view only their own tickets and track the repair status.'],
  ['Assign tickets to technicians', 'Feature', 'The pilot must include a staff dashboard for assigning tickets to technicians.'],
  ['Support mobile and desktop', 'Constraint', 'The portal must work on mobile phones and desktop browsers.'],
  ['Publish deployment and repository', 'Deliverable', 'The team must deliver a working public deployment and a GitHub repository by 30 November 2026.'],
  ['Prepare demo and pitch deck', 'Deliverable', 'The final presentation must include a three-minute demonstration and a seven-slide pitch deck.'],
  ['Measure unresolved tickets', 'Success metric', 'Success will be measured by a 30 percent reduction in unresolved tickets after four weeks.'],
];
async function seedDemo() {
  return getDb().$transaction(async tx => {
    const user = await tx.user.create({ data: { email: `demo-${randomUUID()}@demo.invalid`, name: 'Demo explorer', isDemo: true } });
    await tx.document.create({ data: { ownerId: user.id, title: 'Campus Repair Hub — sample brief', filename: 'Campus Repair Hub.txt', content: DEMO_TEXT, pageCount: 1, sizeBytes: Buffer.byteLength(DEMO_TEXT), requirements: { create: DEMO_REQUIREMENTS.map(([title, category, quote]) => ({ title, category, quote })) } } });
    return user;
  });
}
module.exports = { seedDemo, DEMO_TEXT, DEMO_REQUIREMENTS };
