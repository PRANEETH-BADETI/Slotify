import { http } from "./http";

export async function getPublicEvent(username, slug) {
  const { data } = await http.get(`/public/${username}/${slug}`);
  return data;
}

export async function getPublicAvailability(username, slug, params) {
  const { data } = await http.get(`/public/${username}/${slug}/availability`, {
    params,
  });
  return data;
}

export async function createBooking(username, slug, payload) {
  const { data } = await http.post(`/public/${username}/${slug}/bookings`, payload);
  return data;
}

export async function rescheduleBooking(bookingId, payload) {
  const { data } = await http.patch(`/public/bookings/${bookingId}/reschedule`, payload);
  return data;
}

export async function getBookingConfirmation(bookingId) {
  const { data } = await http.get(`/public/bookings/${bookingId}`);
  return data;
}
