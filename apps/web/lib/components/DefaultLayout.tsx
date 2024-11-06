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
  
  return <div className="max-w-6xl mt-10 mx-auto">{children}</div>;
}
