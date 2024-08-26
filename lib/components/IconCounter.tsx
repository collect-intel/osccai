export default function IconCounter({
  count,
  icon,
}: {
  count: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1 text-xs text-[#A4A4A4] font-mono font-medium">
      {icon}
      {count}
    </div>
  );
}
