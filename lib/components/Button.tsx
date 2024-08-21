export default function Button({title}: {title: string}) {
  return (
    <button className="bg-[#185849] text-sm text-white font-medium p-2 rounded">
      {title}
    </button>
  );
}
