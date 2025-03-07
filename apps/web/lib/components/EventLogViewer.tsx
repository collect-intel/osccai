"use client";

import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { EventType, ResourceType } from "../types/events";

/**
 * Props for the EventLogViewer component
 */
interface EventLogViewerProps {
  /** Filter events by resource type */
  resourceType?: ResourceType;
  /** Filter events by specific resource ID */
  resourceId?: string;
  /** Filter events by event types */
  eventTypes?: EventType[];
  /** Maximum number of events to display */
  limit?: number;
}

/**
 * Interface representing a system event as returned from the API
 */
interface SystemEvent {
  uid: string;
  eventType: string;
  resourceType: string;
  resourceId: string;
  actorId: string;
  actorName?: string;
  isAdminAction: boolean;
  metadata: any;
  createdAt: string;
}

/**
 * Component for displaying a log of system events
 * Can be filtered by resource type, ID, and event types
 */
export default function EventLogViewer({
  resourceType,
  resourceId,
  eventTypes,
  limit = 10
}: EventLogViewerProps) {
  const [events, setEvents] = useState<SystemEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEvents() {
      setLoading(true);
      setError(null);
      try {
        // Build the query URL with filters
        let url = `/api/events?limit=${limit}`;

        if (resourceType) url += `&resourceType=${resourceType}`;
        if (resourceId) url += `&resourceId=${resourceId}`;
        if (eventTypes && eventTypes.length > 0) {
          url += `&eventTypes=${eventTypes.join(',')}`;
        }

        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch events: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        setEvents(data);
      } catch (error) {
        console.error("Failed to fetch events:", error);
        setError(error instanceof Error ? error.message : "Failed to fetch events");
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, [resourceType, resourceId, eventTypes, limit]);

  if (loading) {
    return <div className="p-4">Loading events...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>;
  }

  if (events.length === 0) {
    return <div className="p-4 text-gray-500">No events recorded yet.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resource</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actor</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {events.map((event) => (
            <tr key={event.uid}>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {formatEventType(event.eventType)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatResourceType(event.resourceType)} {truncate(event.resourceId, 8)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {event.actorName || truncate(event.actorId, 8)}
                {event.isAdminAction && <span className="ml-1 text-xs text-red-500">(Admin)</span>}
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">
                {formatEventDetails(event)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Helper function to truncate long strings
 */
function truncate(str: string, length: number): string {
  return str.length > length ? `${str.substring(0, length)}...` : str;
}

/**
 * Format event type for display
 */
function formatEventType(eventType: string): string {
  return eventType
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Format resource type for display
 */
function formatResourceType(resourceType: string): string {
  return resourceType
    .replace(/([A-Z])/g, ' $1')
    .trim();
}

/**
 * Format event details based on event type
 */
function formatEventDetails(event: SystemEvent): React.ReactNode {
  if (!event.metadata) return null;

  switch (event.eventType) {
    case EventType.MODEL_SETTING_CHANGE:
      return (
        <div>
          {Object.entries(event.metadata.changes).map(([field, values]: [string, any]) => (
            <div key={field} className="mb-1">
              <span className="font-medium">{field}:</span>{' '}
              <span className="line-through text-red-500">{formatValue(values.old)}</span>{' '}
              <span className="text-green-500">→ {formatValue(values.new)}</span>
            </div>
          ))}
        </div>
      );

    case EventType.STATEMENT_ADDED:
      return <div>"{truncate(event.metadata.text, 50)}"</div>;

    case EventType.VOTE_CAST:
      return <div>Vote: <span className="font-medium">{event.metadata.voteValue}</span></div>;

    case EventType.GAC_SCORE_UPDATED:
      return (
        <div>
          Score: <span className="line-through">{event.metadata.oldScore?.toFixed(2) || 'None'}</span>{' '}
          → <span className="font-medium">{event.metadata.newScore.toFixed(2)}</span>
        </div>
      );

    case EventType.POLL_CREATED:
    case EventType.POLL_UPDATED:
      return <div>Poll: "{truncate(event.metadata.title, 40)}"</div>;

    case EventType.CONSTITUTION_GENERATED:
    case EventType.CONSTITUTION_ACTIVATED:
      return <div>Version: {event.metadata.version}</div>;

    case EventType.API_KEY_CREATED:
    case EventType.API_KEY_REVOKED:
      return <div>Key: {event.metadata.keyName || "Unnamed"}</div>;

    default:
      try {
        return <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(event.metadata, null, 2)}</pre>;
      } catch (e) {
        return <div className="text-red-400">Unable to display metadata</div>;
      }
  }
}

/**
 * Format different value types for display
 */
function formatValue(value: any): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
} 