import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const pad2 = (value: number) => String(value).padStart(2, '0')

export function formatDateForInput(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

export function formatTimeForInput(date: Date) {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

export function combineLocalDateAndTime(date: string, time: string) {
  return new Date(`${date}T${time}:00`)
}

export function localDateTimeToUtcParts(date: string | Date, time: string) {
  const dateValue = date instanceof Date ? formatDateForInput(date) : date
  const local = combineLocalDateAndTime(dateValue, time)
  const utcIso = local.toISOString()
  return {
    date: utcIso.slice(0, 10),
    time: utcIso.slice(11, 16),
    iso: utcIso,
  }
}

export function utcDateTimeToLocalParts(date: string, time: string) {
  if (!date || !time) return null
  const utcIso = date.includes('T') ? date : `${date}T${time}:00Z`
  const local = new Date(utcIso)
  return {
    date: formatDateForInput(local),
    time: formatTimeForInput(local),
    dateObj: local,
    iso: local.toISOString(),
  }
}

export function capitalizeWords(str) {
  // Split the string by spaces, hyphens, or underscores
    const words = str
    .toLowerCase()
    .trim()
    .split(/[ _-]+/)   // split only on space, underscore, hyphen
    .filter(Boolean);  // remove empty strings
  // Use map to iterate over each word and capitalize its first letter
  const capitalizedWords = words.map(word => {
    if (word.length === 0) {
      return ''; // Handle empty strings if present in the array
    }
    // Capitalize the first character and concatenate with the rest of the word
    return word.charAt(0).toUpperCase() + word.slice(1);
  });

  // console.log(capitalizedWords); // Debugging: Check the capitalized words array

  // Join the capitalized words back into a single string with spaces
  return capitalizedWords.join(' ');
}