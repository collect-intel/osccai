export default function Button({
  title,
  type,
  onClick,
  disabled,
}: {
  title: string;
  type?: "submit" | "reset" | "button";
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      type={type}
      className="bg-[#185849] hover:bg-[#0E352C] text-sm text-white font-medium p-2 rounded"
      disabled={disabled}
    >
      {title}
    </button>
  );
}
