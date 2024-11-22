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

  if (!poll) {
    // Loading skeleton state
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-md shadow-md p-8 max-w-4xl mx-auto">
          <div className="animate-pulse">
            {/* Title skeleton */}
            <div className="h-8 bg-light-gray rounded-md w-2/3 mb-8"></div>

            {/* Stats skeleton */}
            <div className="flex gap-6 mb-6">
              <div className="h-6 bg-light-gray rounded-md w-24"></div>
              <div className="h-6 bg-light-gray rounded-md w-24"></div>
            </div>

            {/* About section skeleton */}
            <div className="mb-8">
              <div className="h-6 bg-light-gray rounded-md w-48 mb-4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-light-gray rounded-md w-full"></div>
                <div className="h-4 bg-light-gray rounded-md w-5/6"></div>
                <div className="h-4 bg-light-gray rounded-md w-4/6"></div>
              </div>
            </div>

            {/* Goal section skeleton */}
            <div className="mb-8">
              <div className="h-6 bg-light-gray rounded-md w-48 mb-4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-light-gray rounded-md w-full"></div>
                <div className="h-4 bg-light-gray rounded-md w-3/4"></div>
              </div>
            </div>

            {/* Voting section skeleton */}
            <div className="bg-light-beige rounded-md p-6">
              <div className="space-y-4">
                <div className="h-5 bg-light-gray rounded-md w-1/3"></div>
                <div className="h-20 bg-light-gray rounded-md w-full"></div>
                <div className="flex justify-center gap-4">
                  <div className="h-10 bg-light-gray rounded-md w-32"></div>
                  <div className="h-10 bg-light-gray rounded-md w-32"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <PollPage poll={poll} isLoggedIn={isLoggedIn} userVotes={userVotes} />;
}
