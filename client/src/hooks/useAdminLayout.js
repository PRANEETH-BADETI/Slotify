import { useOutletContext } from "react-router-dom";

export function useAdminLayout() {
  return useOutletContext();
}
