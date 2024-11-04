export default function IconCounter({
  count,
  icon,
}: {
  count: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1 text-xs text-gray font-mono font-medium">
      {icon}
      {count}
    </div>
  );
}
