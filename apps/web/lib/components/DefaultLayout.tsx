interface DefaultLayoutProps {
  children: React.ReactNode;
  fullWidth?: boolean;
}

export default function DefaultLayout({
  children,
  fullWidth = false,
}: DefaultLayoutProps) {
  if (fullWidth) {
    return children;
  }

  return <div className="w-full max-w-6xl mt-10 mx-auto px-4">{children}</div>;
}
