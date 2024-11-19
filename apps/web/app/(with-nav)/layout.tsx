import Navbar from "@/lib/components/Navbar";

export default function WithNavLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-rows-[auto_1fr] min-w-[320px] w-full">
      <Navbar />
      {children}
    </div>
  );
} 