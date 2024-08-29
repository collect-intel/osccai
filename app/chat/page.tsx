"use client";
import { AiChat, ChatAdapter, StreamingAdapterObserver } from "@nlux/react";
import { useState } from "react";
import {
  Label,
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from "@headlessui/react";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/20/solid";
import type { ModelId } from "@/app/api/chat/route";
import "@nlux/themes/luna.css";

type Model = { id: ModelId; name: string };

const models: Model[] = [
  { id: "beyond_return", name: "Beyond Return (System Prompt)" },
  { id: "bolivia", name: "Bolivian Constitution (System Prompt)" },
  { id: "maintainers", name: "The Maintainers (System Prompt)" },
  {
    id: "cyberspace",
    name: "Declaration of Independence of Cyberspace (System Prompt)",
  },
  { id: "second_life", name: "Second Life Project (System Prompt)" },
];

function SelectModel({
  selected,
  setSelected,
}: {
  selected: Model;
  setSelected: (model: Model) => void;
}) {
  return (
    <Listbox value={selected} onChange={setSelected}>
      <Label className="block text-sm font-medium leading-6 text-gray-900">
        Model
      </Label>
      <div className="relative mt-2">
        <ListboxButton className="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6">
          <span className="block truncate">{selected.name}</span>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronUpDownIcon
              aria-hidden="true"
              className="h-5 w-5 text-gray-400"
            />
          </span>
        </ListboxButton>

        <ListboxOptions
          transition
          className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none data-[closed]:data-[leave]:opacity-0 data-[leave]:transition data-[leave]:duration-100 data-[leave]:ease-in sm:text-sm"
        >
          {models.map((model) => (
            <ListboxOption
              key={model.id}
              value={model}
              className="group relative cursor-default select-none py-2 pl-3 pr-9 text-gray-900 data-[focus]:bg-indigo-600 data-[focus]:text-white"
            >
              <span className="block truncate font-normal group-data-[selected]:font-semibold">
                {model.name}
              </span>

              <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-indigo-600 group-data-[focus]:text-white [.group:not([data-selected])_&]:hidden">
                <CheckIcon aria-hidden="true" className="h-5 w-5" />
              </span>
            </ListboxOption>
          ))}
        </ListboxOptions>
      </div>
    </Listbox>
  );
}

export default function Chat() {
  const [selected, setSelected] = useState(models[0]);

  const chatAdapter: ChatAdapter = {
    streamText: async (prompt: string, observer: StreamingAdapterObserver) => {
      const response = await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({ prompt, modelId: selected.id }),
        headers: { "Content-Type": "application/json" },
      });
      if (response.status !== 200) {
        observer.error(new Error("Failed to connect to the server"));
        return;
      }

      if (!response.body) {
        return;
      }

      // Read a stream of server-sent events
      // and feed them to the observer as they are being generated
      const reader = response.body.getReader();
      const textDecoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        const content = textDecoder.decode(value);
        if (content) {
          observer.next(content);
        }
      }

      observer.complete();
    },
  };

  return (
    <>
      <SelectModel selected={selected} setSelected={setSelected} />
      <main className="flex min-h-screen flex-col items-center justify-between p-24">
        <div className="z-10 w-full max-w-3xl items-center justify-between font-mono text-sm lg:flex">
          <AiChat adapter={chatAdapter} displayOptions={{ themeId: "luna" }} />
        </div>
      </main>
    </>
  );
}
