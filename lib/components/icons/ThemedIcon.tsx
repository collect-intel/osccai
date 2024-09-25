interface ThemedIconProps {
  active: boolean;
  children: React.ReactNode;
}

export function ThemedIcon({ active, children }: ThemedIconProps) {
  return (
    <span className={active ? "text-white" : "text-gray-800"}>
      {children}
    </span>
  );
}