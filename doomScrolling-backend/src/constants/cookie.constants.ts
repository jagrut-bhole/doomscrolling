import type { CookieOptions } from "express";

export const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  path: "/",
};

export const accessTokenCookieOptions: CookieOptions = {
  ...cookieOptions,
  maxAge: 24 * 60 * 60 * 1000, // 1 day
};

export const refreshTokenCookieOptions: CookieOptions = {
  ...cookieOptions,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};
