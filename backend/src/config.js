export const PORT = Number(process.env.PORT || 4000);

export const HOST = process.env.HOST || "0.0.0.0";

export const DATABASE_URL = process.env.DATABASE_URL || "";

export const AUTH_SECRET =
  process.env.AUTH_SECRET || "change-me-in-production";

export const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";
