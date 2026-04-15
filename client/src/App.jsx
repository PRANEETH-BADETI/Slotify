import { Navigate, Route, Routes } from "react-router-dom";
import { AdminLayout } from "./components/layout/AdminLayout";
import { AvailabilityPage } from "./pages/AvailabilityPage";
import { BookingPage } from "./pages/BookingPage";
import { ConfirmationPage } from "./pages/ConfirmationPage";
import { EventTypesPage } from "./pages/EventTypesPage";
import { MeetingsPage } from "./pages/MeetingsPage";
import { NotFoundPage } from "./pages/NotFoundPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<AdminLayout />}>
        <Route index element={<Navigate to="/event-types" replace />} />
        <Route path="event-types" element={<EventTypesPage />} />
        <Route path="availability" element={<AvailabilityPage />} />
        <Route path="meetings" element={<MeetingsPage />} />
      </Route>
      <Route path="/book/:username/:slug" element={<BookingPage />} />
      <Route
        path="/book/:username/:slug/reschedule/:bookingId"
        element={<BookingPage />}
      />
      <Route
        path="/book/:username/:slug/confirmation/:bookingId"
        element={<ConfirmationPage />}
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
