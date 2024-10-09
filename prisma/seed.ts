const { PrismaClient, VoteValue } = require("@prisma/client");
const { v4: uuidv4 } = require("uuid");

const prisma = new PrismaClient();

const DEFAULT_OWNER_EMAIL = "james@cip.org";
const DEFAULT_CLERK_USER_ID = "user_" + uuidv4(); // Generate a mock Clerk user ID

async function main() {
  // Create a default community model owner
  const owner = await prisma.communityModelOwner.create({
    data: {
      uid: uuidv4(),
      name: "James",
      email: DEFAULT_OWNER_EMAIL,
      clerkUserId: DEFAULT_CLERK_USER_ID,
      participant: {
        create: {
          uid: uuidv4(),
        },
      },
    },
  });

  // Create a default community model
  const communityModel = await prisma.communityModel.create({
    data: {
      uid: uuidv4(),
      name: "Default Community Model",
      ownerId: owner.uid,
      goal: "This is a default community model for testing purposes.",
      bio: "This is a default community model for testing purposes.",
      published: true, // Set this to true for the seed data
    },
  });

  // Create a default poll
  const poll = await prisma.poll.create({
    data: {
      uid: uuidv4(),
      communityModelId: communityModel.uid,
      title: "Default Poll",
      description: "This is a default poll for testing purposes.",
      published: true,
      requireAuth: false, // Set this to false for easier testing
      allowParticipantStatements: true,
    },
  });

  // Create some default statements
  const statements = [
    "The AI should prioritize user privacy.",
    "The AI should always provide accurate information.",
    "The AI should be designed to minimize bias.",
  ];

  const createdStatements = await Promise.all(
    statements.map((statementText) =>
      prisma.statement.create({
        data: {
          uid: uuidv4(),
          pollId: poll.uid,
          participantId: owner.participantId!,
          text: statementText,
        },
      }),
    ),
  );

  // Create some anonymous participants
  const anonymousParticipants = await Promise.all(
    Array.from({ length: 5 }, () =>
      prisma.participant.create({
        data: {
          uid: uuidv4(),
          anonymousId: uuidv4(),
        },
      }),
    ),
  );

  // Create random votes for each statement
  const voteValues = Object.values(VoteValue);
  for (const statement of createdStatements) {
    let agreeCount = 0;
    let disagreeCount = 0;
    let passCount = 0;

    for (const participant of anonymousParticipants) {
      const randomVoteValue =
        voteValues[Math.floor(Math.random() * voteValues.length)];
      await prisma.vote.create({
        data: {
          uid: uuidv4(),
          statementId: statement.uid,
          participantId: participant.uid,
          voteValue: randomVoteValue,
        },
      });

      // Update counts based on the vote
      if (randomVoteValue === VoteValue.AGREE) agreeCount++;
      else if (randomVoteValue === VoteValue.DISAGREE) disagreeCount++;
      else if (randomVoteValue === VoteValue.PASS) passCount++;
    }

    // Update the statement with the vote counts
    await prisma.statement.update({
      where: { uid: statement.uid },
      data: {
        agreeCount,
        disagreeCount,
        passCount,
        lastCalculatedAt: new Date(),
      },
    });
  }

  console.log("Database has been seeded.");
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

module.exports = main;
