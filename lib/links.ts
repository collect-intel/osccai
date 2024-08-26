import { Poll } from "@prisma/client";

type subpage = "create" | "settings" | "statements";

export function pollUrl(poll: Poll, subpage: subpage | null = null): string {
  const pollPage = `/${poll.uid}/${poll.urlSlug}`;
  if (subpage == null) {
    return pollPage;
  } else {
    return `${pollPage}/${subpage}`;
  }
}
