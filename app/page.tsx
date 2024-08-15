import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

async function createSurvey() {
  "use server";
  await prisma.survey.create({
    data: {
      title: "New Survey",
      instructions: "Please complete this survey",
    },
  });
  revalidatePath("/");
}

export default async function Home() {
  const surveys = await prisma.survey.findMany();

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
        <h1>OSCCAI</h1>
        {surveys.length === 0 && <p>No surveys found</p>}
        {surveys.map((survey) => (
          <div key={survey.uid}>
            <h2>{survey.title}</h2>
            <p>{survey.instructions}</p>
          </div>
        ))}
        <form action={createSurvey}>
          <button type="submit">Create New Survey</button>
        </form>
      </div>
    </main>
  );
}
