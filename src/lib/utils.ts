import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const pad2 = (value: number) => String(value).padStart(2, '0')

// Convert 12-hour format (e.g., "6:00 AM") to 24-hour format (e.g., "06:00")
export function convert12To24HourFormat(time12: string): string {
  const match = time12.match(/(\d+):(\d+)\s*(AM|PM)/i)
  if (!match) return time12 // Return as-is if doesn't match format
  
  let hours = parseInt(match[1])
  const minutes = match[2]
  const period = match[3].toUpperCase()
  
  if (period === 'PM' && hours !== 12) {
    hours += 12
  } else if (period === 'AM' && hours === 12) {
    hours = 0
  }
  
  return `${pad2(hours)}:${minutes}`
}

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
  // Convert 12-hour format (e.g., "6:00 AM") to 24-hour format if needed
  const time24 = time.includes('AM') || time.includes('PM') ? convert12To24HourFormat(time) : time
  const local = combineLocalDateAndTime(dateValue, time24)
  const utcIso = local.toISOString()
  return {
    date: utcIso.slice(0, 10),
    time: utcIso.slice(11, 16),
    iso: utcIso,
  }
}

export function utcDateTimeToLocalParts(date: string, time: string) {
  if (!date || !time) return null

  // When time already includes a full datetime, parse directly.
  if (typeof time === 'string' && time.includes('T')) {
    const parsed = new Date(time)
    if (!Number.isNaN(parsed.getTime())) {
      return {
        date: formatDateForInput(parsed),
        time: formatTimeForInput(parsed),
        dateObj: parsed,
        iso: parsed.toISOString(),
      }
    }
  }

  // If date is a full ISO string, extract just the date part
  const dateOnly = date.includes('T') ? date.split('T')[0] : date
  // Convert 12-hour format (e.g., "9:00 AM") to 24-hour format if needed
  const time24 = time.includes('AM') || time.includes('PM') ? convert12To24HourFormat(time) : time
  // Add 'Z' to treat as UTC - the backend returns UTC times that need conversion to browser's local timezone
  const utcIso = `${dateOnly}T${time24}:00Z`
  const utcDate = new Date(utcIso)

  if (Number.isNaN(utcDate.getTime())) {
    return null
  }

  return {
    date: formatDateForInput(utcDate),
    time: formatTimeForInput(utcDate),
    dateObj: utcDate,
    iso: utcDate.toISOString(),
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