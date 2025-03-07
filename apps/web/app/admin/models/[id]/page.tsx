import { redirect } from "next/navigation";
import { isCurrentUserAdmin, getCommunityModelAsAdmin } from "@/lib/utils/admin";
import Link from "next/link";
import { AdminModeIndicator } from "@/lib/components/AdminComponents";

export default async function AdminModelViewPage({
  params,
}: {
  params: { id: string };
}) {
  // Check if user is admin
  const isAdmin = await isCurrentUserAdmin();
  
  if (!isAdmin) {
    redirect("/");
  }
  
  // Get the community model
  const model = await getCommunityModelAsAdmin(params.id);
  
  if (!model) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
        <AdminModeIndicator />
        <h1 className="text-2xl md:text-3xl font-bold mb-6">
          Model Not Found
        </h1>
        <p>The requested model could not be found.</p>
        <Link href="/admin" className="text-blue-600 hover:text-blue-800">
          Back to Admin Dashboard
        </Link>
      </div>
    );
  }
  
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
      <AdminModeIndicator />
      
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">
          {model.name}
        </h1>
        <div className="flex gap-2">
          <Link 
            href="/admin"
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded"
          >
            Back to Dashboard
          </Link>
          <Link 
            href={`/community-models/flow/${model.uid}?admin=true`}
            className="bg-teal hover:bg-teal-dark text-white py-2 px-4 rounded"
          >
            Edit Model
          </Link>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Model Details</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Name</h3>
                <p>{model.name}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Goal</h3>
                <p>{model.goal || "No goal set"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Bio</h3>
                <p>{model.bio || "No bio set"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Status</h3>
                <p>
                  {model.published ? (
                    <span className="text-green-600 font-medium">Published</span>
                  ) : (
                    <span className="text-yellow-600 font-medium">Draft</span>
                  )}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">API Enabled</h3>
                <p>{model.apiEnabled ? "Yes" : "No"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Created</h3>
                <p>{new Date(model.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Last Updated</h3>
                <p>{new Date(model.updatedAt).toLocaleString()}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Polls</h2>
            {model.polls.length === 0 ? (
              <p className="text-gray-500">No polls found for this model.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="py-2 px-4 text-left">Title</th>
                      <th className="py-2 px-4 text-left">Published</th>
                      <th className="py-2 px-4 text-left">Created</th>
                      <th className="py-2 px-4 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {model.polls.map((poll) => (
                      <tr key={poll.uid} className="border-b">
                        <td className="py-2 px-4">{poll.title}</td>
                        <td className="py-2 px-4">{poll.published ? "Yes" : "No"}</td>
                        <td className="py-2 px-4">{new Date(poll.createdAt).toLocaleDateString()}</td>
                        <td className="py-2 px-4">
                          <Link 
                            href={`/polls/${poll.uid}`}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        
        <div>
          <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Owner Information</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Name</h3>
                <p>{model.owner.name}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Email</h3>
                <p>{model.owner.email}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">User ID</h3>
                <p className="font-mono text-xs">{model.owner.uid}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Clerk User ID</h3>
                <p className="font-mono text-xs">{model.owner.clerkUserId}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">API Keys</h2>
            {model.apiKeys.length === 0 ? (
              <p className="text-gray-500">No API keys found for this model.</p>
            ) : (
              <div className="space-y-4">
                {model.apiKeys.map((key) => (
                  <div key={key.uid} className="p-3 border rounded">
                    <div className="flex justify-between">
                      <span className="font-medium">{key.name || "Unnamed Key"}</span>
                      <span className={`text-xs ${key.status === "ACTIVE" ? "text-green-600" : "text-red-600"}`}>
                        {key.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Created: {new Date(key.createdAt).toLocaleDateString()}
                    </div>
                    {key.lastUsedAt && (
                      <div className="text-xs text-gray-500">
                        Last used: {new Date(key.lastUsedAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 