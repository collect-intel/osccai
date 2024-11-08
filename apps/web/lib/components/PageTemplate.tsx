export default function PageTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="max-w-6xl mt-10 mx-auto px-4">{children}</div>;
}
