import Voting from "@/lib/components/Voting";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";

export default async function SurveyPage({
  params,
}: {
  params: { surveyId: string };
}) {
  const survey = await prisma.survey.findUnique({
    where: { uid: params.surveyId },
  });
  if (!survey) return notFound();

  const statements = await prisma.statement.findMany({
    where: { surveyId: survey.uid },
  });
  const votes = await prisma.vote.findMany({
    where: { statementId: { in: statements.map(({ uid }) => uid) } },
  });

  return (
    <div className="flex flex-col">
      <h1>{survey.title}</h1>
      <p>{survey.instructions}</p>
      <Voting statements={statements} votes={votes} surveyId={survey.uid} />
    </div>
  );
}
