import { Constitution } from "@prisma/client";

export default function ConstitutionViewer({
  constitution,
}: {
  constitution: Constitution;
}) {
  return (
    <div className="mt-2 p-4 bg-gray-100 rounded">
      <h3 className="font-semibold">Version: {constitution?.version}</h3>
      <pre className="mt-2 whitespace-pre-wrap">
        {constitution?.content || ""}
      </pre>
    </div>
  );
}
