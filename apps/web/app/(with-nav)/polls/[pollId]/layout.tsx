import { Metadata } from "next";
import { getPollData } from "@/lib/data";

export async function generateMetadata({
  params,
}: {
  params: { pollId: string };
}): Promise<Metadata> {
  const poll = await getPollData(params.pollId);

  return {
    title: poll
      ? `${poll.title} | Community Models`
      : "Poll | Community Models",
  };
}

export default function PollLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
