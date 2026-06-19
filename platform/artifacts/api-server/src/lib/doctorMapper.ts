import { doctorsTable } from "../lib/db";

type DoctorRow = typeof doctorsTable.$inferSelect;

export function mapAdminDoctor(d: DoctorRow) {
  return {
    id: d.id,
    name: d.fullName,
    specialty: d.specialty,
    city: d.city ?? "",
    pmdc_number: d.pmdcNumber ?? "",
    status: d.verificationStatus.toLowerCase(),
    joined_date: d.createdAt.toISOString(),
    avatar_url: d.avatarUrl ?? null,
    rating: d.rating != null ? Number.parseFloat(d.rating) : null,
    appointments_completed: d.appointmentsCompleted ?? 0,
    no_shows: d.noShows ?? 0,
    avg_response_time: null,
    featured: d.isFeatured ?? false,
    fee: d.consultationFee != null ? Number.parseFloat(d.consultationFee) : null,
    email: d.email,
    phone: d.phone ?? null,
    gender: d.gender ?? null,
    qualifications: d.qualifications,
    experience_years: d.experienceYears ?? null,
    bio: d.bio ?? null,
    area: d.area ?? null,
    is_available_online: d.isAvailableOnline,
    total_reviews: d.totalReviews,
    verification_status: d.verificationStatus,
  };
}

export function mapPublicDoctor(d: DoctorRow) {
  return {
    id: d.id,
    name: d.fullName,
    fullName: d.fullName,
    specialty: d.specialty,
    city: d.city ?? "",
    area: d.area ?? null,
    pmdc_number: d.pmdcNumber ?? null,
    pmdcNumber: d.pmdcNumber ?? null,
    status: "verified",
    joined_date: d.createdAt.toISOString(),
    avatar_url: d.avatarUrl ?? null,
    rating: d.rating != null ? Number.parseFloat(d.rating) : null,
    appointments_completed: d.appointmentsCompleted ?? 0,
    appointmentsCompleted: d.appointmentsCompleted ?? 0,
    featured: d.isFeatured ?? false,
    fee: d.consultationFee != null ? Number.parseFloat(d.consultationFee) : null,
    consultationFee: d.consultationFee != null ? Number.parseFloat(d.consultationFee) : null,
    gender: d.gender ?? null,
    qualifications: d.qualifications,
    experience_years: d.experienceYears ?? null,
    experienceYears: d.experienceYears ?? null,
    bio: d.bio ?? null,
    is_available_online: d.isAvailableOnline,
    isAvailableOnline: d.isAvailableOnline,
    onlineStatus: d.onlineStatus,
    total_reviews: d.totalReviews,
    totalReviews: d.totalReviews,
    verification_status: "VERIFIED",
    verificationStatus: "VERIFIED",
  };
}
