import { redirect } from "next/navigation";
import { isCurrentUserAdmin, getAllCommunityModels } from "@/lib/utils/admin";
import Link from "next/link";
import { AdminModeIndicator } from "@/lib/components/AdminComponents";

export default async function AdminDashboardPage() {
  // Check if user is admin
  const isAdmin = await isCurrentUserAdmin();
  
  if (!isAdmin) {
    redirect("/");
  }
  
  // Get all community models
  const communityModels = await getAllCommunityModels();
  
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
      <AdminModeIndicator />
      
      <h1 className="text-2xl md:text-3xl font-bold mb-6">
        Admin Dashboard
      </h1>
      
      <div className="bg-white border border-red-200 rounded-lg p-4 md:p-6 mb-6 md:mb-8">
        <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4 text-red-600">
          Admin Mode
        </h2>
        <p className="text-sm md:text-base mb-4">
          You are viewing the admin dashboard. Here you can:
        </p>
        <ul className="list-disc list-inside mb-4 text-sm md:text-base space-y-2">
          <li>View all community models across the platform</li>
          <li>Access and edit any community model</li>
          <li>Monitor platform usage and health</li>
        </ul>
      </div>
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-xl md:text-2xl font-semibold">All Community Models</h2>
      </div>
      
      {communityModels.length === 0 ? (
        <div className="bg-white rounded-lg p-4 md:p-6 text-gray-600 text-sm md:text-base">
          No community models found.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-3 px-4 text-left">Name</th>
                <th className="py-3 px-4 text-left">Owner</th>
                <th className="py-3 px-4 text-left">Created</th>
                <th className="py-3 px-4 text-left">Updated</th>
                <th className="py-3 px-4 text-left">Published</th>
                <th className="py-3 px-4 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {communityModels.map((model) => (
                <tr key={model.uid} className="border-t border-gray-200 hover:bg-gray-50">
                  <td className="py-3 px-4">{model.name}</td>
                  <td className="py-3 px-4">{model.owner.name}</td>
                  <td className="py-3 px-4">{new Date(model.createdAt).toLocaleDateString()}</td>
                  <td className="py-3 px-4">{new Date(model.updatedAt).toLocaleDateString()}</td>
                  <td className="py-3 px-4">{model.published ? "Yes" : "No"}</td>
                  <td className="py-3 px-4">
                    <Link 
                      href={`/admin/models/${model.uid}`}
                      className="text-blue-600 hover:text-blue-800 mr-4"
                    >
                      View
                    </Link>
                    <Link 
                      href={`/community-models/flow/${model.uid}?admin=true`}
                      className="text-teal hover:text-teal-dark"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
} 