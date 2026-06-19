import type {
  AuthenticatedAdmin,
  AuthenticatedDoctor,
  AuthenticatedPatient,
} from "../middlewares/auth";

export type RequestAuth = AuthenticatedAdmin | AuthenticatedDoctor | AuthenticatedPatient;

const ADMIN_SESSION_ROLES = new Set(["SUPER_ADMIN", "ADMIN", "SUPPORT"]);

export function isAdminAuth(auth: RequestAuth): auth is AuthenticatedAdmin {
  return auth.role !== "DOCTOR" && auth.role !== "PATIENT";
}

export function canAccessConsultationSession(
  auth: RequestAuth,
  session: { patientId: string | null; doctorId: string | null },
): boolean {
  if (isAdminAuth(auth)) {
    return ADMIN_SESSION_ROLES.has(auth.role);
  }
  if (auth.role === "DOCTOR") {
    return session.doctorId === auth.doctorId;
  }
  if (auth.role === "PATIENT") {
    return session.patientId === auth.patientId;
  }
  return false;
}

export function canAccessPrescription(
  auth: RequestAuth,
  prescription: { patientId: string; doctorId: string },
): boolean {
  if (isAdminAuth(auth)) {
    return ADMIN_SESSION_ROLES.has(auth.role);
  }
  if (auth.role === "DOCTOR") {
    return prescription.doctorId === auth.doctorId;
  }
  if (auth.role === "PATIENT") {
    return prescription.patientId === auth.patientId;
  }
  return false;
}
