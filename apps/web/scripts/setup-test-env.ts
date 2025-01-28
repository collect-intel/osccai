import { PrismaClient } from "@prisma/client";
import { createApiKey } from "@/lib/actions";

const prisma = new PrismaClient();

async function main() {
  // Create test owner
  const owner = await prisma.communityModelOwner.create({
    data: {
      uid: "test_owner",
      name: "Test Owner",
      email: "test@example.com",
    },
  });

  // Create test model
  const model = await prisma.communityModel.create({
    data: {
      uid: "test_model",
      name: "Test Model",
      ownerId: owner.uid,
      apiEnabled: true,
      published: true,
    },
  });

  // Create test poll
  const poll = await prisma.poll.create({
    data: {
      uid: "test_poll",
      title: "Test Poll",
      description: "A test poll for API testing",
      communityModelId: model.uid,
      published: true,
    },
  });

  // Create API key
  const apiKey = await createApiKey(model.uid, owner.uid, "Test Key");

  // Update test-api.env
  const envContent = `API_KEY=${apiKey.key}
POLL_ID=${poll.uid}
API_KEY_PROD=sk_adf6de48034ad63df28d2605b55005d69e35c46b5b53f70b
POLL_ID_PROD=cm66znpyq0000128sdy83do71
`;

  // Write to file
  const fs = require("fs");
  fs.writeFileSync("scripts/test-api.env", envContent);

  console.log("Test environment set up successfully!");
  console.log("API Key:", apiKey.key);
  console.log("Poll ID:", poll.uid);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect()); 