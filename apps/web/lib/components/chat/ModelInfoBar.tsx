import { FaInfoCircle } from "react-icons/fa";

export default function ModelInfoBar({
  model,
  onViewConstitution,
}: {
  model: any;
  onViewConstitution: () => void;
}) {
  return (
    <div className="bg-white border-b border-gray-200 px-4 py-2 md:py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center min-w-0">
          <div className="truncate">
            <h1 className="text-lg md:text-xl font-semibold text-gray-900 truncate">
              {model.name}
            </h1>
            {/* Only show on desktop */}
            <p className="hidden md:block text-sm text-gray-500 truncate mt-1">
              {model.bio}
            </p>
          </div>
        </div>

        <button
          onClick={onViewConstitution}
          className="ml-4 flex-shrink-0 flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-teal-600 hover:text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-md transition-colors"
        >
          <FaInfoCircle className="w-4 h-4" />
          <span className="hidden md:inline">View Constitution</span>
        </button>
      </div>
    </div>
  );
}
