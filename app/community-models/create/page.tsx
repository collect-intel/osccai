import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createCommunityModel } from "@/lib/actions";

export default function CreateCommunityModelPage() {
  const { userId } = auth();

  if (!userId) {
    redirect("/sign-in");
  }

  async function handleSubmit(formData: FormData) {
    "use server";
    const name = formData.get("name") as string;
    const initialIdea = formData.get("initialIdea") as string;

    if (!name || !initialIdea) {
      // Handle error (you might want to add client-side validation as well)
      return;
    }

    const modelId = await createCommunityModel(name, initialIdea);
    redirect(`/community-models/${modelId}`);
  }

  return (
    <div className="max-w-2xl mx-auto px-4">
      <h1 className="text-3xl font-bold mb-6">Create a New Community Model</h1>

      <form action={handleSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700"
          >
            Model Name
          </label>
          <input
            type="text"
            name="name"
            id="name"
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal focus:ring-teal"
          />
        </div>

        <div>
          <label
            htmlFor="initialIdea"
            className="block text-sm font-medium text-gray-700"
          >
            Describe your community model and its purpose
          </label>
          <textarea
            name="initialIdea"
            id="initialIdea"
            rows={4}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal focus:ring-teal"
            placeholder="Describe the initial concept for your Community Model..."
          ></textarea>
        </div>

        <button
          type="submit"
          className="w-full bg-teal text-white font-medium py-2 px-4 rounded hover:bg-teal-dark transition-colors"
        >
          Create Model
        </button>
      </form>
    </div>
  );
}
