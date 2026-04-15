import { http } from "./http";

export async function getAdminProfile() {
  const { data } = await http.get("/admin/profile");
  return data;
}

export async function getEventTypes() {
  const { data } = await http.get("/admin/event-types");
  return data;
}

export async function createEventType(payload) {
  const { data } = await http.post("/admin/event-types", payload);
  return data;
}

export async function updateEventType(eventTypeId, payload) {
  const { data } = await http.patch(`/admin/event-types/${eventTypeId}`, payload);
  return data;
}

export async function deleteEventType(eventTypeId) {
  const { data } = await http.delete(`/admin/event-types/${eventTypeId}`);
  return data;
}

export async function bulkUpdateEventTypes(payload) {
  const { data } = await http.post("/admin/event-types/bulk", payload);
  return data;
}

export async function getAvailability() {
  const { data } = await http.get("/admin/availability");
  return data;
}

export async function updateAvailability(payload) {
  const { data } = await http.put("/admin/availability", payload);
  return data;
}

export async function getMeetings(params) {
  const { data } = await http.get("/admin/meetings", {
    params,
  });
  return data;
}

export async function cancelMeeting(meetingId) {
  const { data } = await http.patch(`/admin/meetings/${meetingId}/cancel`);
  return data;
}
