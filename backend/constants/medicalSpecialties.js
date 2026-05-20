/** Canonical specialty slugs for filters & appointment requests */
const MEDICAL_SPECIALTIES = [
  { slug: "general_physician_mbbs", label: "General Physician (MBBS)" },
  { slug: "family_medicine_doctor", label: "Family Medicine Doctor" },
  { slug: "internal_medicine_specialist", label: "Internal Medicine Specialist" },
  { slug: "orthopedic_surgeon", label: "Orthopedic Surgeon" },
  { slug: "physiotherapist", label: "Physiotherapist" },
  { slug: "chiropractor", label: "Chiropractor" },
  { slug: "cardiologist", label: "Cardiologist" },
  { slug: "cardiac_surgeon", label: "Cardiac Surgeon" },
  { slug: "neurologist", label: "Neurologist" },
  { slug: "psychiatrist", label: "Psychiatrist" },
  { slug: "psychologist", label: "Psychologist" },
  { slug: "pediatrician", label: "Pediatrician" },
  { slug: "gynecologist", label: "Gynecologist" },
  { slug: "obstetrician", label: "Obstetrician" },
  { slug: "dentist", label: "Dentist" },
  { slug: "orthodontist", label: "Orthodontist" },
  { slug: "ophthalmologist", label: "Ophthalmologist" },
  { slug: "ent_specialist", label: "ENT Specialist" },
  { slug: "dermatologist", label: "Dermatologist" },
  { slug: "allergist_immunologist", label: "Allergist / Immunologist" },
  { slug: "gastroenterologist", label: "Gastroenterologist" },
  { slug: "pulmonologist", label: "Pulmonologist" },
];

const SPECIALTY_SLUGS = new Set(MEDICAL_SPECIALTIES.map((s) => s.slug));

const labelForSlug = (slug) => MEDICAL_SPECIALTIES.find((s) => s.slug === slug)?.label || slug;

/** Ordered unique valid slugs from doctorProfile (supports legacy single `specialty`). */
const doctorSpecialtySlugsFromProfile = (doctorProfile) => {
  if (!doctorProfile) return [];
  const arr = doctorProfile.specialties;
  if (Array.isArray(arr) && arr.length > 0) {
    const out = [];
    const seen = new Set();
    for (const x of arr) {
      const s = String(x || "").trim();
      if (!SPECIALTY_SLUGS.has(s) || seen.has(s)) continue;
      seen.add(s);
      out.push(s);
    }
    if (out.length) return out;
  }
  const one = String(doctorProfile.specialty || "").trim();
  return SPECIALTY_SLUGS.has(one) ? [one] : [];
};

const buildDoctorProfilePublic = (doctorProfile) => {
  const slugs = doctorSpecialtySlugsFromProfile(doctorProfile || {});
  const primary = slugs[0] || "";
  return {
    specialties: slugs,
    specialtyLabels: slugs.map(labelForSlug),
    specialtiesDisplay: slugs.length ? slugs.map(labelForSlug).join(" · ") : "",
    specialty: primary,
    specialtyLabel: primary ? labelForSlug(primary) : "",
    profilePictureUrl: doctorProfile?.profilePictureUrl || "",
    clinicAddress: doctorProfile?.clinicAddress || "",
    availabilityMode: doctorProfile?.availabilityMode || "both",
    consultationFees: {
      fee30Min: Number(doctorProfile?.consultationFees?.fee30Min || 0),
      fee1Hour: Number(doctorProfile?.consultationFees?.fee1Hour || 0),
      fee3Hour: Number(doctorProfile?.consultationFees?.fee3Hour || 0),
    },
    workingDays: Array.isArray(doctorProfile?.workingDays) ? doctorProfile.workingDays : [],
    timeSlots: Array.isArray(doctorProfile?.timeSlots) ? doctorProfile.timeSlots : [],
  };
};

module.exports = {
  MEDICAL_SPECIALTIES,
  SPECIALTY_SLUGS,
  labelForSlug,
  doctorSpecialtySlugsFromProfile,
  buildDoctorProfilePublic,
};
