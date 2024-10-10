import { PrismaClient, Poll, Statement, Vote, Participant, Prisma } from '@prisma/client';
import { Matrix } from 'ml-matrix';
import { PCA } from 'ml-pca';
import { kmeans } from 'ml-kmeans';

const prisma = new PrismaClient();

export default async function updateGACScores() {
  try {
    const polls = await fetchPollsWithChanges();

    for (const poll of polls) {
      const { statements, votes, participants } = await fetchPollData(poll.uid);
      const voteMatrix = generateVoteMatrix(statements, votes, participants);
      const clusters = performClustering(voteMatrix);
      const gacScores = calculateGACScores(voteMatrix, clusters);

      await updateStatements(statements, gacScores);
    }

    console.log('GAC scores updated successfully');
  } catch (error) {
    console.error('Error updating GAC scores:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function fetchPollsWithChanges(): Promise<Poll[]> {
  return prisma.poll.findMany({
    where: {
      statements: {
        some: {
          votes: {
            some: {
              OR: [
                {
                  createdAt: {
                    gt: prisma.statement.findFirst({
                      where: { pollId: { equals: prisma.poll.uid } },
                      orderBy: { lastCalculatedAt: 'desc' },
                      select: { lastCalculatedAt: true },
                    }).lastCalculatedAt,
                  },
                },
                {
                  updatedAt: {
                    gt: prisma.statement.findFirst({
                      where: { pollId: { equals: prisma.poll.uid } },
                      orderBy: { lastCalculatedAt: 'desc' },
                      select: { lastCalculatedAt: true },
                    }).lastCalculatedAt,
                  },
                },
              ],
            },
          },
        },
      },
    },
  });
}

async function fetchPollData(pollId: string): Promise<{ statements: Statement[]; votes: Vote[]; participants: Participant[] }> {
  const statements = await prisma.statement.findMany({ where: { pollId } });
  const votes = await prisma.vote.findMany({ where: { statement: { pollId } } });
  const participants = await prisma.participant.findMany({
    where: { votes: { some: { statement: { pollId } } } },
  });

  return { statements, votes, participants };
}

function generateVoteMatrix(statements: Statement[], votes: Vote[], participants: Participant[]): number[][] {
  const matrix = Array(participants.length).fill(null).map(() => Array(statements.length).fill(0));

  const participantIndex = new Map(participants.map((p, i) => [p.uid, i]));
  const statementIndex = new Map(statements.map((s, i) => [s.uid, i]));

  for (const vote of votes) {
    const pIndex = participantIndex.get(vote.participantId);
    const sIndex = statementIndex.get(vote.statementId);
    if (pIndex !== undefined && sIndex !== undefined) {
      matrix[pIndex][sIndex] = vote.voteValue === 'AGREE' ? 1 : vote.voteValue === 'DISAGREE' ? -1 : 0;
    }
  }

  return matrix;
}

function performClustering(voteMatrix: number[][]): number[] {
  const pca = new PCA(new Matrix(voteMatrix));
  const explained = pca.getExplainedVariance();
  const optimalComponents = explained.findIndex((value: number) => value < 0.01) || 2;
  const projection = pca.predict(new Matrix(voteMatrix), { nComponents: optimalComponents });

  const { clusters } = kmeans(projection.to2DArray(), Math.min(5, Math.floor(projection.rows / 10)));
  return clusters;
}

function calculateGACScores(voteMatrix: number[][], clusters: number[]): Map<number, number> {
  const gacScores = new Map<number, number>();

  for (let statementIndex = 0; statementIndex < voteMatrix[0].length; statementIndex++) {
    const statementVotes = voteMatrix.map(row => row[statementIndex]);
    let gac = 1.0;

    const uniqueClusters = Array.from(new Set(clusters));
    for (const cluster of uniqueClusters) {
      const clusterVotes = statementVotes.filter((_, i) => clusters[i] === cluster);
      const sumAgrees = clusterVotes.filter(v => v > 0).length;
      const sumAbsVotes = clusterVotes.filter(v => v !== 0).length;

      const pAgree = sumAbsVotes === 0 ? 0.5 : (1 + sumAgrees) / (2 + sumAbsVotes);
      gac *= pAgree;
    }

    gacScores.set(statementIndex, gac);
  }

  return gacScores;
}

async function updateStatements(statements: Statement[], gacScores: Map<number, number>) {
  const now = new Date();

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    const gacScore = gacScores.get(i);

    if (gacScore !== undefined) {
      await prisma.statement.update({
        where: { uid: statement.uid },
        data: {
          gacScore: gacScore,
          lastCalculatedAt: now,
        },
      });
    }
  }
}
