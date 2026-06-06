import { apiRequest, ApiError } from "./api";
import { PaginatedResponse, unwrapPaginated } from "./pagination";
import { clearAuth, getToken } from "./auth";

export interface EventOrganizer {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string | null;
  imageUrl: string | null;
  category: string | null;
  organizerId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  organizer: EventOrganizer;
  isOrganizer: boolean;
  isGoing: boolean;
  attendeesCount: number;
}

export interface EventAttendee {
  id: string;
  eventId: string;
  userId: string;
  status: string;
  createdAt: string;
  user: EventOrganizer;
}

export interface CreateEventPayload {
  title: string;
  description: string;
  location: string;
  startDate: string;
  endDate?: string;
  imageUrl?: string;
  category?: string;
}

export interface UpdateEventPayload {
  title?: string;
  description?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  imageUrl?: string;
  category?: string;
}

export interface EventsFilters {
  q?: string;
  location?: string;
  category?: string;
  timeframe?: "all" | "live" | "upcoming" | "past";
  page?: number;
  limit?: number;
}

function authHeaders(): HeadersInit {
  const token = getToken();

  if (!token) {
    throw new ApiError("Not authenticated", 401);
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

async function withAuth<T>(request: () => Promise<T>): Promise<T> {
  try {
    return await request();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      clearAuth();
    }
    throw error;
  }
}

export function formatEventDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export async function fetchEventsSafe(
  filters: EventsFilters = {},
): Promise<{
  items: Event[];
  hasMore: boolean;
  warning: string | null;
}> {
  try {
    const data = await fetchEvents(filters);
    return { items: data.items, hasMore: data.hasMore, warning: null };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      throw error;
    }
    return {
      items: [],
      hasMore: false,
      warning: "Could not load happenings. Please try again.",
    };
  }
}

export async function fetchEvents(
  filters: EventsFilters = {},
): Promise<PaginatedResponse<Event>> {
  const params = new URLSearchParams();
  if (filters.q?.trim()) params.set("q", filters.q.trim());
  if (filters.location?.trim()) params.set("location", filters.location.trim());
  if (filters.category?.trim()) params.set("category", filters.category.trim());
  if (filters.timeframe) params.set("timeframe", filters.timeframe);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));

  const query = params.toString();
  const path = query ? `/events?${query}` : "/events";

  return withAuth(() =>
    apiRequest<PaginatedResponse<Event> | Event[]>(path, {
      headers: authHeaders(),
    }).then(unwrapPaginated),
  );
}

export async function fetchEventAttendeesSafe(
  eventId: string,
): Promise<{ attendees: EventAttendee[]; warning: string | null }> {
  try {
    const attendees = await fetchEventAttendees(eventId);
    return { attendees, warning: null };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      throw error;
    }
    return { attendees: [], warning: null };
  }
}

export async function fetchEvent(id: string): Promise<Event> {
  return withAuth(() =>
    apiRequest<Event>(`/events/${id}`, {
      headers: authHeaders(),
    }),
  );
}

export async function fetchEventAttendees(
  eventId: string,
): Promise<EventAttendee[]> {
  return withAuth(() =>
    apiRequest<EventAttendee[]>(`/events/${eventId}/attendees`, {
      headers: authHeaders(),
    }),
  );
}

export async function createEvent(payload: CreateEventPayload): Promise<Event> {
  return withAuth(() =>
    apiRequest<Event>("/events", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    }),
  );
}

export async function updateEvent(
  id: string,
  payload: UpdateEventPayload,
): Promise<Event> {
  return withAuth(() =>
    apiRequest<Event>(`/events/${id}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    }),
  );
}

export async function deleteEvent(id: string): Promise<{ message: string }> {
  return withAuth(() =>
    apiRequest<{ message: string }>(`/events/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    }),
  );
}

export async function joinEvent(eventId: string): Promise<Event> {
  return withAuth(() =>
    apiRequest<Event>(`/events/${eventId}/join`, {
      method: "POST",
      headers: authHeaders(),
    }),
  );
}

export async function leaveEvent(eventId: string): Promise<Event> {
  return withAuth(() =>
    apiRequest<Event>(`/events/${eventId}/leave`, {
      method: "POST",
      headers: authHeaders(),
    }),
  );
}
