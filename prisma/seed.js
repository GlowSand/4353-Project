import prisma from '../server/db.js';
import { demoVols, demoEvents } from "../server/demo_data/volunteer_events.data.js";

async function seedDemo() {
  console.log("Seeding demo volunteers and events...");

  // per-volunteer TX: credentials first, then profile
  for (const v of demoVols) {
    await prisma.$transaction(async (tx) => {
      await tx.userCredentials.upsert({
        where: { userId: v.id },
        update: {}, // no change on reseed
        create: {
          userId: v.id,
          password: "demo" // placeholder; hash in real apps
        },
      });

      await tx.userProfile.upsert({
        where: { userId: v.id },
        update: {
          fullName: v.name,
          address1: v.location,
          city: v.location,
          state: "TX",
          zipCode: "00000",
          skills: v.skills,
          preferences: null,
          availability: [],
        },
        create: {
          userId: v.id,
          fullName: v.name,
          address1: v.location,
          city: v.location,
          state: "TX",
          zipCode: "00000",
          skills: v.skills,
          preferences: null,
          availability: [],
        },
      });
    });
  }

  // events
  for (const e of demoEvents) {
    await prisma.eventDetails.upsert({
      where: { id: e.id },
      update: {
        eventName: e.name,
        description: e.name,
        location: e.location,
        requiredSkills: e.requiredSkills,
        urgency: e.urgency,
        eventDate: new Date(e.date),
      },
      create: {
        id: e.id,
        eventName: e.name,
        description: e.name,
        location: e.location,
        requiredSkills: e.requiredSkills,
        urgency: e.urgency,
        eventDate: new Date(e.date),
      },
    });
  }

  console.log("Demo volunteers and events seeded.");
}


const usStates = [
  { stateCode: 'AL', stateName: 'Alabama' },
  { stateCode: 'AK', stateName: 'Alaska' },
  { stateCode: 'AZ', stateName: 'Arizona' },
  { stateCode: 'AR', stateName: 'Arkansas' },
  { stateCode: 'CA', stateName: 'California' },
  { stateCode: 'CO', stateName: 'Colorado' },
  { stateCode: 'CT', stateName: 'Connecticut' },
  { stateCode: 'DE', stateName: 'Delaware' },
  { stateCode: 'FL', stateName: 'Florida' },
  { stateCode: 'GA', stateName: 'Georgia' },
  { stateCode: 'HI', stateName: 'Hawaii' },
  { stateCode: 'ID', stateName: 'Idaho' },
  { stateCode: 'IL', stateName: 'Illinois' },
  { stateCode: 'IN', stateName: 'Indiana' },
  { stateCode: 'IA', stateName: 'Iowa' },
  { stateCode: 'KS', stateName: 'Kansas' },
  { stateCode: 'KY', stateName: 'Kentucky' },
  { stateCode: 'LA', stateName: 'Louisiana' },
  { stateCode: 'ME', stateName: 'Maine' },
  { stateCode: 'MD', stateName: 'Maryland' },
  { stateCode: 'MA', stateName: 'Massachusetts' },
  { stateCode: 'MI', stateName: 'Michigan' },
  { stateCode: 'MN', stateName: 'Minnesota' },
  { stateCode: 'MS', stateName: 'Mississippi' },
  { stateCode: 'MO', stateName: 'Missouri' },
  { stateCode: 'MT', stateName: 'Montana' },
  { stateCode: 'NE', stateName: 'Nebraska' },
  { stateCode: 'NV', stateName: 'Nevada' },
  { stateCode: 'NH', stateName: 'New Hampshire' },
  { stateCode: 'NJ', stateName: 'New Jersey' },
  { stateCode: 'NM', stateName: 'New Mexico' },
  { stateCode: 'NY', stateName: 'New York' },
  { stateCode: 'NC', stateName: 'North Carolina' },
  { stateCode: 'ND', stateName: 'North Dakota' },
  { stateCode: 'OH', stateName: 'Ohio' },
  { stateCode: 'OK', stateName: 'Oklahoma' },
  { stateCode: 'OR', stateName: 'Oregon' },
  { stateCode: 'PA', stateName: 'Pennsylvania' },
  { stateCode: 'RI', stateName: 'Rhode Island' },
  { stateCode: 'SC', stateName: 'South Carolina' },
  { stateCode: 'SD', stateName: 'South Dakota' },
  { stateCode: 'TN', stateName: 'Tennessee' },
  { stateCode: 'TX', stateName: 'Texas' },
  { stateCode: 'UT', stateName: 'Utah' },
  { stateCode: 'VT', stateName: 'Vermont' },
  { stateCode: 'VA', stateName: 'Virginia' },
  { stateCode: 'WA', stateName: 'Washington' },
  { stateCode: 'WV', stateName: 'West Virginia' },
  { stateCode: 'WI', stateName: 'Wisconsin' },
  { stateCode: 'WY', stateName: 'Wyoming' },
];

async function seedStates() {
  console.log('Seeding states...');
  
  for (const state of usStates) {
    await prisma.states.upsert({
      where: { stateCode: state.stateCode },
      update: {},
      create: state,
    });
  }

  console.log('States seeded successfully!');
}

async function main() {
  try {
    await seedStates();
    await seedDemo();
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
