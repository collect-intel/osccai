import { prisma } from "@/lib/db";

export default async function SurveyPage({
  params,
}: {
  params: { surveyId: string };
}) {
  const survey = await prisma.survey.findUnique({
    where: { uid: params.surveyId },
  });
  if (!survey) {
    return <h1>Survey not found</h1>;
  }

  return (
    <div>
      <h1>{survey.title}</h1>
      <p>{survey.instructions}</p>
    </div>
  );
}
