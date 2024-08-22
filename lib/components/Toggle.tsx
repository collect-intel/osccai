import { Field, Label, Switch } from "@headlessui/react";

export default function Toggle({
  label,
  enabled,
  setEnabled,
  details,
}: {
  label: string;
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  details: string;
}) {
  return (
    <div>
      <span className="block text-lg font-medium mb-4">{label}</span>
      <Field className="flex items-center">
        <Switch
          checked={enabled}
          onChange={setEnabled}
          className="group relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-[#E0E0E0] transition-colors duration-200 ease-in-out focus:outline-none data-[checked]:bg-[#185849]"
        >
          <span
            aria-hidden="true"
            className="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out group-data-[checked]:translate-x-5"
          />
        </Switch>
        <Label as="span" className="ml-3 text-sm">
          <span className="text-[#A4A4A4]">{details}</span>
        </Label>
      </Field>
    </div>
  );
}
