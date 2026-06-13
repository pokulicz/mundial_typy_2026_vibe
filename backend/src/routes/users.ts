import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { prisma } from "../prisma";
import { CreateUserSchema, UpdateUserSchema } from "../types";
import {
  requireAdmin,
  hashPin,
  HttpError,
  type AppVariables,
} from "../auth";

const usersRouter = new Hono<{ Variables: AppVariables }>();

function publicUser(u: {
  id: string;
  username: string;
  role: string;
  active: boolean;
  createdAt: Date;
}) {
  return {
    id: u.id,
    username: u.username,
    role: u.role,
    active: u.active,
    createdAt: u.createdAt.toISOString(),
  };
}

// List all users (admin)
usersRouter.get("/", async (c) => {
  requireAdmin(c);
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
  return c.json({ data: users.map(publicUser) });
});

// Create user (admin)
usersRouter.post("/", zValidator("json", CreateUserSchema), async (c) => {
  requireAdmin(c);
  const { username, pin, role } = c.req.valid("json");
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    throw new HttpError(409, "Taka nazwa użytkownika już istnieje", "USERNAME_TAKEN");
  }
  const user = await prisma.user.create({
    data: { username, pinHash: await hashPin(pin), role },
  });
  return c.json({ data: publicUser(user) });
});

// Update user (admin)
usersRouter.patch("/:id", zValidator("json", UpdateUserSchema), async (c) => {
  const admin = requireAdmin(c);
  const id = c.req.param("id");
  const body = c.req.valid("json");

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) throw new HttpError(404, "Nie znaleziono użytkownika", "NOT_FOUND");

  // Guard: don't let an admin lock themselves out (deactivate/demote self)
  if (target.id === admin.id) {
    if (body.role === "PLAYER" || body.active === false) {
      throw new HttpError(400, "Nie możesz odebrać uprawnień ani dezaktywować samego siebie", "SELF_LOCKOUT");
    }
  }

  if (body.username && body.username !== target.username) {
    const dup = await prisma.user.findUnique({ where: { username: body.username } });
    if (dup) throw new HttpError(409, "Taka nazwa użytkownika już istnieje", "USERNAME_TAKEN");
  }

  const data: Record<string, unknown> = {};
  if (body.username !== undefined) data.username = body.username;
  if (body.role !== undefined) data.role = body.role;
  if (body.active !== undefined) data.active = body.active;
  if (body.pin !== undefined) data.pinHash = await hashPin(body.pin);

  const user = await prisma.user.update({ where: { id }, data });

  // If deactivated, kill their sessions
  if (body.active === false) {
    await prisma.session.deleteMany({ where: { userId: id } });
  }

  return c.json({ data: publicUser(user) });
});

// Delete user (admin)
usersRouter.delete("/:id", async (c) => {
  const admin = requireAdmin(c);
  const id = c.req.param("id");
  if (id === admin.id) {
    throw new HttpError(400, "Nie możesz usunąć samego siebie", "SELF_DELETE");
  }
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) throw new HttpError(404, "Nie znaleziono użytkownika", "NOT_FOUND");
  await prisma.user.delete({ where: { id } });
  return c.json({ data: { ok: true } });
});

export { usersRouter };
