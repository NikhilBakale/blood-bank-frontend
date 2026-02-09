import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Blood type compatibility - which blood types can donate TO a recipient
// Key = recipient blood type, Value = array of compatible donor blood types
export const bloodCompatibility: Record<string, string[]> = {
  "AB+": ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"], // Universal recipient
  "AB-": ["A-", "B-", "AB-", "O-"],
  "A+": ["A+", "A-", "O+", "O-"],
  "A-": ["A-", "O-"],
  "B+": ["B+", "B-", "O+", "O-"],
  "B-": ["B-", "O-"],
  "O+": ["O+", "O-"],
  "O-": ["O-"], // Universal donor (can only receive O-)
};

// Get compatible donor blood types for a recipient
export function getCompatibleDonorTypes(recipientBloodType: string): string[] {
  return bloodCompatibility[recipientBloodType] || [recipientBloodType];
}
