import Link from "next/link";

interface CommunityModel {
  uid: string;
  name: string;
  initialIdea: string;
}

export default function CommunityModelCard({
  model,
}: {
  model: CommunityModel;
}) {
  return (
    <div className="p-4 border rounded">
      <h2 className="text-lg font-medium">{model.name}</h2>
      <p className="mt-2">
        {model.initialIdea.length > 100
          ? `${model.initialIdea.substring(0, 100)}...`
          : model.initialIdea}
      </p>
      <Link
        href={`/community-models/${model.uid}`}
        className="text-teal mt-4 block"
      >
        View Details
      </Link>
    </div>
  );
}
