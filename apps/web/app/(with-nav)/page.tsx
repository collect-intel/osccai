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
        <main className="max-w-7xl mx-auto px-4 py-8 md:py-12">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">
              Welcome to Community Models
            </h1>
            <p className="text-xl text-gray-600">
              Open-Source Collective Constitutional AI
            </p>
          </div>

          <div className="max-w-lg mx-auto mb-12">
            <div className="bg-white border border-yellow rounded-lg p-6">
              <p className="text-lg font-semibold mb-3">Welcome back!</p>
              <p className="text-gray-600 mb-6">
                Ready to continue shaping the future of AI?
              </p>
              <Link
                href="/community-models"
                className="block w-full bg-teal text-white text-center font-medium py-3 px-4 rounded hover:bg-teal-dark transition-colors"
              >
                View My Community Models
              </Link>
            </div>
          </div>

          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-semibold mb-6">
              About Community Models
            </h2>
            <div className="prose prose-lg max-w-none text-gray-600 space-y-6">
              <p className="text-left">
                <strong>Community Models</strong> is a platform that enables
                communities to collaboratively create and refine AI models based
                on collectively defined constitutions.
              </p>
              <p className="text-left">
                Our goal is to democratize AI alignment by allowing diverse
                groups to shape AI behavior according to their shared values and
                preferences.
              </p>
              <p className="text-left">
                Continue contributing to the development of open-source AI
                models, participate in polls, and help shape the future of
                artificial intelligence!
              </p>
            </div>
          </div>
        </main>
      </DefaultLayout>
    );
  }

  return (
    <DefaultLayout>
      <main className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">
            Welcome to Community Models
          </h1>
          <p className="text-xl text-gray-600">
            Create a custom AI for your community
          </p>
        </div>

        <div className="max-w-lg mx-auto mb-12">
          <div className="bg-light-yellow border border-yellow rounded-lg p-6">
            <p className="text-lg font-semibold mb-3">Join the community!</p>
            <p className="text-gray-600 mb-6">
              Sign up or log in to participate in polls and create community
              models.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <SignUpButton mode="modal">
                <button className="w-full sm:w-auto bg-teal text-white font-medium py-3 px-6 rounded hover:bg-teal-dark transition-colors">
                  Sign up
                </button>
              </SignUpButton>
              <SignInButton mode="modal">
                <button className="w-full sm:w-auto bg-white text-teal border-2 border-teal font-medium py-3 px-6 rounded hover:bg-light-teal transition-colors">
                  Log in
                </button>
              </SignInButton>
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-semibold mb-6">
            About Community Models
          </h2>
          <div className="prose prose-lg max-w-none text-gray-600 space-y-6">
            <p className="text-left">
              Community Models enable groups of people to collaboratively create
              and refine AI models based on collectively defined constitutions.
            </p>
            <p className="text-left">
              Our goal is to democratize AI alignment by allowing diverse groups
              to shape AI behavior according to their shared values and
              preferences.
            </p>
            <p className="text-left">
              Join our community to contribute to the development of open-source
              AI models, participate in polls, and help shape the future of
              artificial intelligence!
            </p>
          </div>
        </div>
      </main>
    </DefaultLayout>
  );
}
