import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import DefaultLayout from "@/lib/components/DefaultLayout";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { linkClerkUserToCommunityModelOwner } from "@/lib/actions";
import Link from "next/link";

export default async function Home() {
  const { userId } = auth();

  if (userId) {
    await linkClerkUserToCommunityModelOwner();

    return (
      <DefaultLayout>
        <main className="text-center">
          <h1 className="text-4xl font-bold mb-6">Welcome to OSCCAI</h1>
          <p className="text-xl mb-8">
            Open-Source Collective Constitutional AI
          </p>

          <div className="bg-white border border-yellow rounded-lg p-6 mb-8 max-w-md mx-auto">
            <p className="text-lg font-semibold mb-4">Welcome back!</p>
            <p className="mb-6">Ready to continue shaping the future of AI?</p>
            <Link
              href="/community-models"
              className="bg-teal text-white font-medium py-2 px-4 rounded hover:bg-teal-dark transition-colors"
            >
              View My Community Models
            </Link>
          </div>

          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-semibold mb-4">About OSCCAI</h2>
            <p className="mb-4">
              OSCCAI (Open-Source Collective Constitutional AI) is a platform
              that enables communities to collaboratively create and refine AI
              models based on collectively defined constitutions.
            </p>
            <p className="mb-4">
              Our goal is to democratize AI alignment by allowing diverse groups
              to shape AI behavior according to their shared values and
              preferences.
            </p>
            <p>
              Continue contributing to the development of open-source AI models,
              participate in polls, and help shape the future of artificial
              intelligence!
            </p>
          </div>
        </main>
      </DefaultLayout>
    );
  }

  return (
    <DefaultLayout>
      <main className="text-center">
        <h1 className="text-4xl font-bold mb-6">Welcome to OSCCAI</h1>
        <p className="text-xl mb-8">Open-Source Collective Constitutional AI</p>

        <div className="bg-light-yellow border border-yellow rounded-lg p-6 mb-8 max-w-md mx-auto">
          <p className="text-lg font-semibold mb-4">Join the community!</p>
          <p className="mb-6">
            Sign up or log in to participate in polls and create community
            models.
          </p>
          <div className="flex justify-center gap-4">
            <SignUpButton mode="modal">
              <button className="bg-teal text-white font-medium py-2 px-4 rounded hover:bg-teal-dark transition-colors">
                Sign up
              </button>
            </SignUpButton>
            <SignInButton mode="modal">
              <button className="bg-white text-teal border border-teal font-medium py-2 px-4 rounded hover:bg-light-teal transition-colors">
                Log in
              </button>
            </SignInButton>
          </div>
        </div>

        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-semibold mb-4">About OSCCAI</h2>
          <p className="mb-4">
            OSCCAI (Open-Source Collective Constitutional AI) is a platform that
            enables communities to collaboratively create and refine AI models
            based on collectively defined constitutions.
          </p>
          <p className="mb-4">
            Our goal is to democratize AI alignment by allowing diverse groups
            to shape AI behavior according to their shared values and
            preferences.
          </p>
          <p>
            Join our community to contribute to the development of open-source
            AI models, participate in polls, and help shape the future of
            artificial intelligence!
          </p>
        </div>
      </main>
    </DefaultLayout>
  );
}
