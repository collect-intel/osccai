import { PrismaClient } from '@prisma/client'
import { hash } from 'bcrypt'
import crypto from 'crypto'

const prisma = new PrismaClient()

async function main() {
  // Create a test API key
  const rawApiKey = `sk-test-${crypto.randomBytes(24).toString('hex')}`
  const hashedKey = await hash(rawApiKey, 10)
  
  // Replace these IDs with actual values from your local DB
  const ownerId = 'your-test-owner-id'
  const modelId = 'your-test-model-id'
  
  // Enable API access for the model
  await prisma.communityModel.update({
    where: { uid: modelId },
    data: { apiEnabled: true }
  })
  
  // Create the API key
  const apiKey = await prisma.apiKey.create({
    data: {
      key: hashedKey,
      name: 'Test Key',
      ownerId,
      modelId,
    }
  })
  
  console.log('Created API key:', rawApiKey)
  console.log('Associated with model:', modelId)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect()) 