"use client";

import { useState } from "react";
import { EventType } from "@/lib/types/events";
import EventLogViewer from "@/lib/components/EventLogViewer";

interface AdminActivityLogProps {
  modelId: string;
}

export default function AdminActivityLog({ modelId }: AdminActivityLogProps) {
  const [selectedEventType, setSelectedEventType] = useState<
    EventType[] | undefined
  >(undefined);

  return (
    <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Activity Log</h2>
        <select
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          onChange={(e) => {
            const selectedType = e.target.value;
            setSelectedEventType(
              selectedType === "all" ? undefined : [selectedType as EventType],
            );
          }}
        >
          <option value="all">All Events</option>
          {Object.values(EventType).map((type) => (
            <option key={type} value={type}>
              {type
                .replace(/_/g, " ")
                .toLowerCase()
                .replace(/\b\w/g, (c) => c.toUpperCase())}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-2">
        <EventLogViewer
          communityModelId={modelId}
          limit={20}
          compact={true}
          eventTypes={selectedEventType}
        />
      </div>
    </div>
  );
}
