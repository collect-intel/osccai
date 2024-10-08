import Link from "next/link";

interface CommunityModel {
  uid: string;
  name: string;
  goal: string;
  createdAt: Date;
}

export default function CommunityModelCard({
  model,
}: {
  model: CommunityModel;
}) {
  // Format the date
  const formattedDate = model.createdAt.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).replace(',', '').replace(' ', ' at ');

  return (
    <Link href={`/community-models/flow/${model.uid}`} className="block h-full">
      <div className="p-4 border rounded-md bg-dark-green text-white hover:bg-opacity-90 transition-colors h-full flex flex-col">
        <h2 className="text-lg font-medium">{model.name}</h2>
        <p className="mt-2 flex-grow">
          {model.goal.length > 100
            ? `${model.goal.substring(0, 100)}...`
            : model.goal}
        </p>
        <p className="text-white font-mono mt-4 text-sm">
          {formattedDate}
        </p>
      </div>
    </Link>
  );
}
