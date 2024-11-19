import ConstitutionIcon from "@/lib/components/icons/ConstitutionIcon";
import LockIcon from "@/lib/components/icons/LockIcon";
import { LinkIcon } from "@heroicons/react/24/outline";
import { useToast } from "@/lib/useToast";
import Toast from "@/lib/components/Toast";

interface ModelInfoBarProps {
  model: {
    name: string;
    bio: string;
    goal?: string;
    published: boolean;
    constitutions: Array<{ version: string }>;
  };
  onViewConstitution: () => void;
}

export default function ModelInfoBar({ model, onViewConstitution }: ModelInfoBarProps) {
  const { isVisible, message, showToast } = useToast();

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(window.location.href);
    showToast("Link Copied!");
  };

  return (
    <div className="w-full bg-white shadow-sm mb-4 rounded-lg">
      <div className="max-w-[1536px] mx-auto px-4 py-3 flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-medium text-gray-900 truncate">
              {model.name}
            </h1>
            {!model.published && (
              <div className="group relative inline-block">
                <LockIcon className="w-4 h-4 text-teal" />
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1
                              invisible group-hover:visible opacity-0 group-hover:opacity-100
                              transition-all duration-200 z-10">
                  <div className="bg-black/75 text-white text-xs rounded-md py-1.5 px-3 whitespace-nowrap">
                    Private Preview Mode
                  </div>
                  <div className="w-2 h-2 bg-black/75 transform rotate-45 translate-x-[calc(50%-1px)] 
                                -translate-y-1 mx-auto"></div>
                </div>
              </div>
            )}
            <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-sm">
              v{model.constitutions[0].version}
            </span>
          </div>
          <div className="mt-1 flex gap-6 text-sm text-gray-500">
            <p className="truncate">
              <span className="font-medium text-gray-700">Bio:</span> {model.bio}
            </p>
            {model.goal && (
              <p className="truncate">
                <span className="font-medium text-gray-700">Goal:</span> {model.goal}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 relative">
          <Toast message={message} isVisible={isVisible} />

          {model.published && (
            <button
              onClick={handleCopyUrl}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 
                       hover:text-gray-900 bg-gray-50 rounded-md hover:bg-gray-100 
                       transition-colors"
              title="Copy model URL"
            >
              <LinkIcon className="w-4 h-4" />
              Copy URL
            </button>
          )}
          <button
            onClick={onViewConstitution}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-teal-700 
                     bg-teal-50 rounded-md hover:bg-teal-100 transition-colors"
          >
            <ConstitutionIcon className="w-4 h-4" />
            View Constitution
          </button>
        </div>
      </div>
    </div>
  );
} 