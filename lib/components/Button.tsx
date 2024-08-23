export default function Button({
  title,
  type,
  onClick,
  disabled,
  icon,
}: {
  title: string;
  type?: "submit" | "reset" | "button";
  onClick?: () => void;
  disabled?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      type={type}
      className="flex items-center gap-2 bg-[#185849] hover:bg-[#0E352C] text-sm text-white font-medium p-2 rounded"
      disabled={disabled}
    >
      {icon && icon}
      {title}
    </button>
  );
}
