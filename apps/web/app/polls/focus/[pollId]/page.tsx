"use client";

import { useEffect, useState } from "react";
import PollFocusPage from "./PollFocusPage";
import { getAnonymousId } from "@/lib/client_utils/getAnonymousId";

export default function PollFocusPageWrapper({
  params,
}: {
  params: { pollId: string };
}) {
  const [poll, setPoll] = useState<any>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userVotes, setUserVotes] = useState<Record<string, any>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const anonymousId = getAnonymousId();

      try {
        const res = await fetch(`/api/polls/${params.pollId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ anonymousId }),
        });

        const text = await res.text();
        const data = JSON.parse(text);

        if (res.ok) {
          setPoll(data.poll);
          setIsLoggedIn(data.isLoggedIn);
          setUserVotes(data.userVotes);
        } else {
          setError(data.error || "Poll not found");
        }
      } catch (err) {
        setError("Unable to load poll");
      }
    };

    fetchData();
  }, [params.pollId]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-2 sm:p-4 bg-soft-gray">
        <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg p-4 sm:p-8 text-center">
          <h1 className="text-2xl font-semibold text-charcoal mb-4">Poll Not Found</h1>
          <p className="text-medium-gray">
            {error === "Poll not found" 
              ? "This poll doesn't exist or may have been deleted."
              : "There was a problem loading this poll."}
          </p>
        </div>
      </div>
    );
  }

  if (!poll) {
    return (
      <div className="min-h-screen flex items-center justify-center p-2 sm:p-4">
        <div className="w-full max-w-2xl animate-pulse">
          <div className="h-8 bg-light-gray rounded-md w-2/3 mx-auto mb-8"></div>
          <div className="space-y-4">
            <div className="h-20 bg-light-gray rounded-md w-full"></div>
            <div className="h-20 bg-light-gray rounded-md w-full"></div>
            <div className="h-20 bg-light-gray rounded-md w-full"></div>
          </div>
        </div>
      </div>
    );
  }

  return <PollFocusPage poll={poll} isLoggedIn={isLoggedIn} userVotes={userVotes} />;
} 