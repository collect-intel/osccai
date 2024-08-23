export default function IconCounter({
  count,
  children,
}: {
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1 text-xs text-[#A4A4A4] font-mono font-medium">
      {children}
      {count}
    </div>
  );
}
