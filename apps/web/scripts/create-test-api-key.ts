import { PrismaClient } from '@prisma/client'
import { createApiKey } from '@/lib/actions'

const prisma = new PrismaClient()

async function main() {
  // Replace these IDs with actual values from your local DB
  const ownerId = 'your-test-owner-id'
  const modelId = 'your-test-model-id'
  
  // Enable API access for the model
  await prisma.communityModel.update({
    where: { uid: modelId },
    data: { apiEnabled: true }
  })
  
  // Create the API key using the new function
  const apiKey = await createApiKey(modelId, ownerId, 'Test Key')
  
  console.log('Created API key:', apiKey.key)
  console.log('Associated with model:', modelId)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect()) 