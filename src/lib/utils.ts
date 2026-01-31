import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}



export function capitalizeWords(str) {
  // Split the string by spaces, hyphens, or underscores
    const words = str.toLowerCase().split(/[ -_]+/);

  // Use map to iterate over each word and capitalize its first letter
  const capitalizedWords = words.map(word => {
    if (word.length === 0) {
      return ''; // Handle empty strings if present in the array
    }
    // Capitalize the first character and concatenate with the rest of the word
    return word.charAt(0).toUpperCase() + word.slice(1);
  });

  // Join the capitalized words back into a single string with spaces
  return capitalizedWords.join(' ');
}