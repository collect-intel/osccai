"use client";

import { useEffect, useState } from "react";
import PollPage from "./PollPage";
import { getAnonymousId } from "@/lib/client_utils/getAnonymousId";
import { isPollOwner, fetchUserVotes } from "@/lib/actions";

export default function PollPageWrapper({
  params,
}: {
  params: { pollId: string };
}) {
  const [poll, setPoll] = useState<any>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userVotes, setUserVotes] = useState<Record<string, any>>({});

  useEffect(() => {
    const fetchData = async () => {
      const anonymousId = getAnonymousId();

      const res = await fetch(`/api/polls/${params.pollId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ anonymousId }),
      });

      console.log("RES", res);

      const text = await res.text();
      const data = JSON.parse(text);

      if (res.ok) {
        setPoll(data.poll);
        setIsLoggedIn(data.isLoggedIn);
        setUserVotes(data.userVotes);
      } else {
        console.error("Error fetching poll data:", data.error);
      }
    };

    fetchData();
  }, [params.pollId]);

  if (!poll) return <div>Loading...</div>;

  return <PollPage poll={poll} isLoggedIn={isLoggedIn} userVotes={userVotes} />;
}
