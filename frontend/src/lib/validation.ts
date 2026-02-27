import { Filter } from "bad-words";

const filter = new Filter();

// Validates text input for profanity
export const validateTextInput = (
  text: string,
): { isValid: boolean; message: string } => {
  if (!text || text.trim() === "") {
    return { isValid: true, message: "" };
  }

  if (filter.isProfane(text)) {
    return {
      isValid: false,
      message: "Invalid text detected. Please use appropriate language.",
    };
  }

  return { isValid: true, message: "" };
};
