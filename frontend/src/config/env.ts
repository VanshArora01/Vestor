const required = (value: string | undefined, name: string): string => {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

export const env = {
  apiBaseUrl: required(import.meta.env.VITE_API_BASE_URL, "VITE_API_BASE_URL"),
};
