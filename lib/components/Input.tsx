import { useId } from "react";

export default function Input({
  value,
  setValue,
  label,
  description,
}: {
  value: string;
  setValue: (value: string) => void;
  label: string;
  description: string;
}) {
  const id = useId();
  return (
    <div className="mb-6">
      <label htmlFor={id} className="block text-lg font-medium">
        {label}
      </label>
      <div className="text-sm text-gray mt-2">{description}</div>
      <div className="mt-4">
        <input
          id={id}
          type="text"
          placeholder=""
          className="block w-full rounded-md border-0 py-1.5 bg-off-white shadow-sm ring-1 ring-inset ring-light-gray placeholder:text-gray-400 focus:ring-inset focus:ring-teal sm:text-sm sm:leading-6"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </div>
    </div>
  );
}
