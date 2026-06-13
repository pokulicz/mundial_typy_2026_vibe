import type { Context, Next } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { prisma } from "./prisma";

export const SESSION_COOKIE = "mundial_session";
const SESSION_DAYS = 60; // remember session for 60 days

export type SessionUser = {
  id: string;
  username: string;
  role: string;
  active: boolean;
};

export type AppVariables = {
  user: SessionUser | null;
};

// ---------- PIN hashing (Bun built-in) ----------

export async function hashPin(pin: string): Promise<string> {
  return Bun.password.hash(pin, { algorithm: "bcrypt", cost: 10 });
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  try {
    return await Bun.password.verify(pin, hash);
  } catch {
    return false;
  }
}

// ---------- Sessions ----------

function newToken(): string {
  return crypto.randomUUID() + crypto.randomUUID().replace(/-/g, "");
}

export async function createSession(c: Context, userId: string) {
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.session.create({ data: { token, userId, expiresAt } });

  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "None",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
    partitioned: true, // needed for cookies inside Vibecode iframe preview
  });
}

export async function destroySession(c: Context) {
  const token = getCookie(c, SESSION_COOKIE);
  if (token) {
    await prisma.session.deleteMany({ where: { token } });
  }
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
}

// Auth middleware: populates c.var.user (or null)
export async function authMiddleware(c: Context, next: Next) {
  const token = getCookie(c, SESSION_COOKIE);
  c.set("user", null);
  if (token) {
    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });
    if (session && session.expiresAt > new Date() && session.user.active) {
      c.set("user", {
        id: session.user.id,
        username: session.user.username,
        role: session.user.role,
        active: session.user.active,
      });
    } else if (session) {
      // expired or inactive — clean up
      await prisma.session.deleteMany({ where: { token } }).catch(() => {});
    }
  }
  await next();
}

// Guards
export function requireUser(c: Context): SessionUser {
  const user = c.get("user") as SessionUser | null;
  if (!user) {
    throw new HttpError(401, "Musisz być zalogowany", "UNAUTHORIZED");
  }
  return user;
}

export function requireAdmin(c: Context): SessionUser {
  const user = requireUser(c);
  if (user.role !== "ADMIN") {
    throw new HttpError(403, "Brak uprawnień administratora", "FORBIDDEN");
  }
  return user;
}

// ---------- Error helper ----------

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code: string = "ERROR"
  ) {
    super(message);
  }
}
