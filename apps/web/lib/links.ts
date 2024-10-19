import { Poll } from "@prisma/client";

export function pollUrl(poll: Poll) {
  return `/polls/${poll.uid}`;
}
