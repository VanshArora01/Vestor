const required = (value: string | undefined, name: string): string => {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const configuredApiBaseUrl =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? "https://vestor-1.onrender.com" : undefined);

export const env = {
  apiBaseUrl: required(configuredApiBaseUrl, "VITE_API_BASE_URL").replace(/\/+$/, ""),
};
