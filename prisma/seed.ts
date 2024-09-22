const { PrismaClient, VoteValue } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

const DEFAULT_OWNER_EMAIL = 'james@cip.org';
const DEFAULT_CLERK_USER_ID = 'user_' + uuidv4(); // Generate a mock Clerk user ID

async function main() {
  // Create a default community model owner
  const owner = await prisma.communityModelOwner.create({
    data: {
      uid: uuidv4(),
      name: 'James',
      email: DEFAULT_OWNER_EMAIL,
      clerkUserId: DEFAULT_CLERK_USER_ID, // Add this line
      participant: {
        create: {
          uid: uuidv4(),
        }
      }
    },
  })

  // Create a default community model
  const communityModel = await prisma.communityModel.create({
    data: {
      uid: uuidv4(),
      name: 'Default Community Model',
      ownerId: owner.uid,
      initialIdea: 'This is a default community model for testing purposes.',
    },
  })

  // Create a default poll
  const poll = await prisma.poll.create({
    data: {
      uid: uuidv4(),
      communityModelId: communityModel.uid,
      title: 'Default Poll',
      published: true,
    },
  })

  // Create some default statements
  const statements = [
    'The AI should prioritize user privacy.',
    'The AI should always provide accurate information.',
    'The AI should be designed to minimize bias.',
  ]

  const createdStatements = await Promise.all(statements.map(statementText =>
    prisma.statement.create({
      data: {
        uid: uuidv4(),
        pollId: poll.uid,
        participantId: owner.participantId!,
        text: statementText,
      },
    })
  ))

  // Create some anonymous participants
  const anonymousParticipants = await Promise.all(
    Array.from({ length: 5 }, () =>
      prisma.participant.create({
        data: {
          uid: uuidv4(),
          anonymousId: uuidv4(),
        },
      })
    )
  )

  // Create random votes for each statement
  const voteValues = Object.values(VoteValue)
  for (const statement of createdStatements) {
    for (const participant of anonymousParticipants) {
      const randomVoteValue = voteValues[Math.floor(Math.random() * voteValues.length)]
      await prisma.vote.create({
        data: {
          uid: uuidv4(),
          statementId: statement.uid,
          participantId: participant.uid,
          voteValue: randomVoteValue,
        },
      })
    }
  }

  console.log('Database has been seeded.')
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

module.exports = main;