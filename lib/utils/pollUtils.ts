import { Statement, Vote, VoteValue } from "@prisma/client";

export function isStatementConstitutionable(
  statement: Statement & { votes?: Vote[] },
): boolean {
  if (statement.isConstitutionable === true) {
    return statement.isConstitutionable;
  } else {
    // Temporarily we'll use a simple majority to determine if a statement is constitutionable if it is not determined as so by the consensus service.
    // MVP-only! (TODO: remove)
    const votes = statement.votes || [];
    const totalVotes = votes.length;
    const agreeVotes = votes.filter(
      (vote) => vote.voteValue === VoteValue.AGREE,
    ).length;
    const agreePercentage =
      totalVotes > 0 ? (agreeVotes / totalVotes) * 100 : 0;
    return agreePercentage >= 66.67;
  }
}
