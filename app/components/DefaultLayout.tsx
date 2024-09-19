export default function DefaultLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-4xl mt-10 mx-auto">
      {children}
    </div>
  );
}