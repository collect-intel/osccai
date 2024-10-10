import { PrismaClient, Poll, Statement, Vote, Participant } from '@prisma/client';
import { Matrix } from 'ml-matrix';
import { PCA } from 'ml-pca';
import { kmeans } from 'ml-kmeans';

const prisma = new PrismaClient();

export default async function updateGACScores() {
  try {
    const polls = await fetchPollsWithChanges();
    console.log(`Found ${polls.length} polls with changes`);

    for (const poll of polls) {
      console.log(`Processing poll: ${poll.uid}`);
      const { statements, votes, participants } = await fetchPollData(poll.uid);
      console.log(`Poll data: ${statements.length} statements, ${votes.length} votes, ${participants.length} participants`);

      if (statements.length === 0 || votes.length === 0 || participants.length === 0) {
        console.log(`Skipping poll ${poll.uid} due to insufficient data`);
        continue;
      }

      const voteMatrix = generateVoteMatrix(statements, votes, participants);
      console.log(`Generated vote matrix: ${voteMatrix.length}x${voteMatrix[0].length}`);

      if (voteMatrix.length === 0 || voteMatrix[0].length === 0) {
        console.log(`Skipping poll ${poll.uid} due to empty vote matrix`);
        continue;
      }

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
  const lastCalculatedAt = await prisma.statement.findFirst({
    orderBy: { lastCalculatedAt: 'desc' },
    select: { lastCalculatedAt: true },
  }).then(result => result?.lastCalculatedAt ?? new Date(0));

  return prisma.poll.findMany({
    where: {
      statements: {
        some: {
          votes: {
            some: {
              OR: [
                { createdAt: { gt: lastCalculatedAt } },
                { updatedAt: { gt: lastCalculatedAt } },
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
  console.log('Performing clustering...');
  const pca = new PCA(new Matrix(voteMatrix));
  const explained = pca.getExplainedVariance();
  const optimalComponents = Math.max(1, explained.findIndex((value: number) => value < 0.01) || 2);
  console.log(`Optimal PCA components: ${optimalComponents}`);

  const projection = pca.predict(new Matrix(voteMatrix), { nComponents: optimalComponents });
  console.log(`PCA projection shape: ${projection.rows}x${projection.columns}`);

  const numClusters = Math.min(5, Math.floor(projection.rows / 10));
  console.log(`Number of clusters: ${numClusters}`);

  if (numClusters < 2) {
    console.log('Not enough data for clustering, returning single cluster');
    return Array(voteMatrix.length).fill(0);
  }

  const { clusters } = kmeans(projection.to2DArray(), numClusters, { seed: 42 });
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
          isConstitutionable: gacScore >= 0.66,
        },
      });
    }
  }
}
