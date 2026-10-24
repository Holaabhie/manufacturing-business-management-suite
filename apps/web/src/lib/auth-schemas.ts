import { z } from "zod";

/**
 * Normalizes an Indian phone number and returns the standard E.164 string
 * along with all candidate variations (+91, 91, 10-digit) for legacy lookups.
 */
export function normalizeIndianPhone(input: unknown): {
  e164: string;
  candidates: string[];
  digits: string;
} | null {
  if (typeof input !== "string") return null;

  let cleaned = input.trim().replace(/\s+/g, "");
  const hasPlus = cleaned.startsWith("+");
  const digitsOnly = cleaned.replace(/\D/g, "");

  let tenDigits = "";
  if (digitsOnly.length === 10 && /^[6-9]\d{9}$/.test(digitsOnly)) {
    tenDigits = digitsOnly;
  } else if (
    digitsOnly.length === 12 &&
    digitsOnly.startsWith("91") &&
    /^[6-9]\d{9}$/.test(digitsOnly.slice(2))
  ) {
    tenDigits = digitsOnly.slice(2);
  } else if (
    digitsOnly.length === 11 &&
    digitsOnly.startsWith("0") &&
    /^[6-9]\d{9}$/.test(digitsOnly.slice(1))
  ) {
    tenDigits = digitsOnly.slice(1);
  } else {
    // If not standard 10-digit, but has digits, create candidates for exact match
    if (digitsOnly.length >= 7) {
      return {
        e164: hasPlus ? `+${digitsOnly}` : digitsOnly,
        candidates: Array.from(new Set([cleaned, digitsOnly, `+${digitsOnly}`])),
        digits: digitsOnly,
      };
    }
    return null;
  }

  const e164 = `+91${tenDigits}`;
  const candidates = Array.from(
    new Set([e164, `91${tenDigits}`, tenDigits])
  );

  return {
    e164,
    candidates,
    digits: tenDigits,
  };
}

export const ForgotPasswordSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(10, "Phone number is required")
    .max(25, "Phone number is invalid"),
});

export const VerifyOtpSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(10, "Phone number is required")
    .max(25, "Phone number is invalid"),
  otp: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "OTP must be exactly 6 digits"),
  purpose: z.enum(["login", "forgot-password"], {
    message: "Invalid verification purpose",
  }),
});

export const ResetPasswordSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(10, "Phone number is required")
    .max(25, "Phone number is invalid"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters"),
  resetToken: z
    .string()
    .trim()
    .min(32, "Invalid reset token"),
});

export const RegisterSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters"),
  fullName: z
    .string()
    .trim()
    .max(100)
    .optional(),
  phone: z
    .string()
    .trim()
    .min(10, "Please enter a valid phone number")
    .max(25, "Phone number is invalid"),
});

export const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().optional(),
  password: z.string().min(1, "Password is required"),
  loginType: z.enum(["admin", "staff"]).default("admin"),
  employeeId: z.string().trim().optional(),
  masterKey: z.string().trim().optional(),
  rememberMe: z.boolean().optional(),
  otp: z.string().trim().optional(),
}).refine((data) => {
  if (data.loginType === "staff") {
    return Boolean(data.employeeId || data.email);
  }
  return Boolean(data.email);
}, {
  message: "Email or Employee ID is required",
  path: ["email"],
});

export const SendOtpSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(10, "Phone number is required")
    .max(25, "Phone number is invalid")
    .optional(),
  email: z.string().trim().email().optional(),
  userId: z.string().trim().optional(),
  purpose: z.enum(["login", "forgot-password", "step-up"]).default("login"),
}).refine((data) => Boolean(data.phone || data.email || data.userId), {
  message: "Phone number, email, or userId is required",
  path: ["phone"],
});

