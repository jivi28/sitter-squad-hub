import { z } from 'zod';

// Sanitize text to prevent XSS
const sanitizeText = (text: string): string => {
  return text
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .trim();
};

// Custom string schema with sanitization and validation
const sanitizedString = (minLength: number, maxLength: number, message: string) => 
  z.string()
    .min(minLength, message)
    .max(maxLength, `Must be less than ${maxLength} characters`)
    .transform(sanitizeText);

// Booking request validation schema
export const bookingRequestSchema = z.object({
  booking_date: z.string().refine(
    (date) => {
      const bookingDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return bookingDate >= today;
    },
    { message: "Booking date must be today or in the future" }
  ),
  start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format"),
  end_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format"),
  num_children: z.number().int().min(1, "Must have at least 1 child").max(10, "Maximum 10 children"),
  service_type: z.enum(['babysitting', 'pet_sitting']),
  special_notes: z.string().max(500).transform(sanitizeText).optional(),
  preferred_language: z.string().max(50).transform(sanitizeText).optional(),
}).refine(
  (data) => data.start_time < data.end_time,
  { message: "End time must be after start time", path: ["end_time"] }
);

// Parent signup validation schema - requires children OR pets (or both)
export const parentSignupSchema = z.object({
  firstName: sanitizedString(1, 50, "First name is required"),
  lastName: sanitizedString(1, 50, "Last name is required"),
  phone: z.string().min(10, "Valid phone number required").max(20),
  address: sanitizedString(5, 200, "Address is required"),
  num_children: z.number().int().min(0).max(10),
  children_ages: z.string().max(100).transform(sanitizeText).optional(),
  num_pets: z.number().int().min(0).max(10),
  pet_details: z.string().max(500).transform(sanitizeText).optional(),
  emergency_contact: z.string().max(100).transform(sanitizeText).optional(),
  special_needs: z.string().max(500).transform(sanitizeText).optional(),
  agreeTerms: z.boolean().refine(val => val === true, {
    message: "You must agree to the terms"
  }),
  agreeBackground: z.boolean().refine(val => val === true, {
    message: "You must agree to the background check"
  })
}).refine(
  (data) => (data.num_children > 0) || (data.num_pets > 0),
  { message: "You must have at least 1 child or 1 pet", path: ["num_children"] }
).refine(
  (data) => data.num_children === 0 || (data.children_ages && data.children_ages.trim().length > 0),
  { message: "Please provide children's ages", path: ["children_ages"] }
).refine(
  (data) => data.num_pets === 0 || (data.pet_details && data.pet_details.trim().length > 0),
  { message: "Please provide pet details", path: ["pet_details"] }
);

// Sitter signup validation schema
export const sitterSignupSchema = z.object({
  firstName: sanitizedString(1, 50, "First name is required"),
  lastName: sanitizedString(1, 50, "Last name is required"),
  phone: z.string().min(10, "Valid phone number required").max(20),
  dateOfBirth: z.string().refine(
    (date) => {
      const birthDate = new Date(date);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      return age >= 16 && age <= 100;
    },
    { message: "Must be at least 16 years old" }
  ),
  school: sanitizedString(1, 100, "School is required"),
  grade: z.string().min(1, "Grade is required"),
  address: sanitizedString(5, 200, "Address is required"),
  hourlyRate: z.number().int().min(5, "Minimum rate is €5").max(50, "Maximum rate is €50"),
  experience: sanitizedString(10, 1000, "Please describe your experience (minimum 10 characters)"),
  petExperience: z.string().max(500).transform(sanitizeText).optional(),
  specialSkills: z.string().max(500).transform(sanitizeText).optional(),
  references: z.string().max(500).transform(sanitizeText).optional(),
  transportation: z.string().max(200).transform(sanitizeText).optional(),
  languages: z.array(z.string()).optional(),
  agreeTerms: z.boolean().refine(val => val === true, {
    message: "You must agree to the terms"
  }),
  agreeBackground: z.boolean().refine(val => val === true, {
    message: "You must agree to the background check"
  }),
  over16: z.boolean().refine(val => val === true, {
    message: "You must be over 16 years old"
  })
});

export type BookingRequestInput = z.infer<typeof bookingRequestSchema>;
export type ParentSignupInput = z.infer<typeof parentSignupSchema>;
export type SitterSignupInput = z.infer<typeof sitterSignupSchema>;
