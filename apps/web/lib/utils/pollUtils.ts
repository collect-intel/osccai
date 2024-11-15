import { Statement, Vote, VoteValue } from "@prisma/client";

export function isStatementConstitutionable(
  statement: Statement & { votes?: Vote[] },
): boolean {
  // If isConstitutionable is explicitly set (true or false), use that value
  if (
    statement.isConstitutionable !== null &&
    statement.isConstitutionable !== undefined
  ) {
    return statement.isConstitutionable;
  }

  // Only calculate based on votes if isConstitutionable is null/undefined
  const votes = statement.votes || [];
  const totalVotes = votes.length;
  const agreeVotes = votes.filter(
    (vote) => vote.voteValue === VoteValue.AGREE,
  ).length;
  const agreePercentage = totalVotes > 0 ? (agreeVotes / totalVotes) * 100 : 0;
  return agreePercentage >= 66.67;
}
