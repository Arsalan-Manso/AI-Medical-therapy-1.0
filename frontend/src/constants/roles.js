export const ROLES = ["Admin", "Doctor", "Patient", "Pharmacy"];

export const roleFromParam = (value = "") => {
  const normalized = value.toLowerCase();
  const match = ROLES.find((role) => role.toLowerCase() === normalized);
  return match || null;
};

export const roleRouteSegment = (role) => role.toLowerCase();
