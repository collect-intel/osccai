import { NextRequest, NextResponse } from 'next/server';
import { getPollData } from '@/lib/data';
import { getOrCreateParticipant, fetchUserVotes } from '@/lib/actions';

export async function POST(
  req: NextRequest,
  { params }: { params: { pollId: string } }
) {
  console.log('Request to /api/polls/[pollId] with pollId:', params.pollId);
  
  const body = await req.json();
  const { anonymousId } = body;

  console.log('anonymousId:', anonymousId);

  if (typeof params.pollId !== 'string') {
    return NextResponse.json({ error: 'Invalid poll ID' }, { status: 400 });
  }

  const poll = await getPollData(params.pollId);
  if (!poll) {
    return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
  }

  const participant = await getOrCreateParticipant(null, anonymousId);
  const isLoggedIn = !!participant?.clerkUserId;
  const userVotes = isLoggedIn
    ? await fetchUserVotes(poll.uid, participant.uid)
    : {};

  return NextResponse.json({ poll, isLoggedIn, userVotes });
}