"use client";

import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { EventType, ResourceType, EVENT_DISPLAY_CONFIG } from "../types/events";

/**
 * Props for the EventLogViewer component
 */
interface EventLogViewerProps {
  /** Filter events by resource type */
  resourceType?: ResourceType;
  /** Filter events by specific resource ID */
  resourceId?: string;
  /** Filter events by community model ID */
  communityModelId?: string;
  /** Filter events by event types */
  eventTypes?: EventType[];
  /** Maximum number of events to display */
  limit?: number;
  /** Whether to use compact mode with minimal padding */
  compact?: boolean;
}

/**
 * Interface representing a system event as returned from the API
 */
interface SystemEvent {
  uid: string;
  eventType: string;
  resourceType: string;
  resourceId: string;
  communityModelId?: string;
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
  communityModelId,
  eventTypes,
  limit = 10,
  compact = true
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
        if (communityModelId) url += `&communityModelId=${communityModelId}`;
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
  }, [resourceType, resourceId, communityModelId, eventTypes, limit]);

  if (loading) {
    return <div className="text-sm p-2">Loading events...</div>;
  }

  if (error) {
    return <div className="text-sm p-2 text-red-500">Error: {error}</div>;
  }

  if (events.length === 0) {
    return <div className="text-sm p-2 text-gray-500">No events recorded yet.</div>;
  }

  // Define classes based on compact mode
  const headerClasses = compact 
    ? "px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" 
    : "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider";
    
  const cellClasses = compact 
    ? "px-2 py-1 text-xs text-gray-500" 
    : "px-6 py-4 text-sm text-gray-500";
    
  const cellClassesNoWrap = `${cellClasses} whitespace-nowrap`;

  return (
    <div className="overflow-x-auto overflow-y-auto max-h-[500px] border border-gray-200 rounded-md">
      <table className="min-w-full divide-y divide-gray-200 table-fixed">
        <thead className="bg-gray-50 sticky top-0">
          <tr>
            <th className={`${headerClasses} w-[20%]`}>Time</th>
            <th className={`${headerClasses} w-[20%]`}>Event</th>
            <th className={`${headerClasses} w-[15%]`}>Actor</th>
            <th className={`${headerClasses} w-[45%]`}>Details</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {events.map((event) => (
            <tr key={event.uid} className="hover:bg-gray-50">
              <td className={cellClassesNoWrap}>
                {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
              </td>
              <td className={`${cellClassesNoWrap} font-medium text-gray-900`}>
                {formatEventType(event.eventType)}
              </td>
              <td className={cellClassesNoWrap}>
                <div className="flex items-center">
                  {event.actorName || truncate(event.actorId, 8)}
                  {event.isAdminAction && 
                    <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Admin
                    </span>
                  }
                </div>
              </td>
              <td className={cellClasses}>
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
  if (!str) return '';
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
 * Dynamically access a nested property using a dot-notation path
 */
function getNestedValue(obj: any, path: string): any {
  if (!path) return null;
  return path.split('.').reduce((o, p) => (o ? o[p] : null), obj);
}

/**
 * Format event details based on event type
 */
function formatEventDetails(event: SystemEvent): React.ReactNode {
  if (!event.metadata) return null;
  
  // Get the display config for this event type
  const displayConfig = EVENT_DISPLAY_CONFIG[event.eventType as EventType];
  if (!displayConfig) {
    // Fallback for events without a display config
    return <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(event.metadata, null, 2)}</pre>;
  }

  // Handle special case for model setting changes
  if (event.eventType === EventType.MODEL_SETTING_CHANGE) {
    return (
      <div className="space-y-0.5">
        {Object.entries(event.metadata.changes).map(([field, values]: [string, any]) => (
          <div key={field} className="flex flex-wrap items-center gap-1">
            <span className="font-medium text-xs">{field}:</span>
            <span className="text-red-500 line-through text-xs">{formatValue(values.old)}</span>
            <span className="text-green-600 text-xs">→ {formatValue(values.new)}</span>
          </div>
        ))}
      </div>
    );
  }

  // For other event types, use the display config
  const { label, valuePath, valueFormat, maxLength } = displayConfig;
  const value = valuePath ? getNestedValue(event.metadata, valuePath) : null;

  // Format the value based on the specified format
  let formattedValue: string | React.ReactNode = "";
  switch (valueFormat) {
    case 'text':
      formattedValue = value ? truncate(String(value), maxLength || 40) : '';
      break;
    case 'score':
      formattedValue = typeof value === 'number' ? value.toFixed(2) : value;
      break;
    case 'boolean':
      formattedValue = value ? 'Yes' : 'No';
      break;
    case 'version':
      formattedValue = `v${value}`;
      break;
    default:
      formattedValue = String(value || '');
  }

  // Return with appropriate styling
  return (
    <div>
      <span className="font-medium text-xs mr-1">{label}:</span>
      <span className="text-xs">{formattedValue}</span>
    </div>
  );
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