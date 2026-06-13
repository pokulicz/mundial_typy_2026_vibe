import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { prisma } from "../prisma";
import { LoginSchema } from "../types";
import {
  createSession,
  destroySession,
  verifyPin,
  requireUser,
  HttpError,
  type AppVariables,
} from "../auth";

const authRouter = new Hono<{ Variables: AppVariables }>();

authRouter.post("/login", zValidator("json", LoginSchema), async (c) => {
  const { username, pin } = c.req.valid("json");
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !user.active) {
    throw new HttpError(401, "Nieprawidłowa nazwa lub PIN", "BAD_CREDENTIALS");
  }
  const ok = await verifyPin(pin, user.pinHash);
  if (!ok) {
    throw new HttpError(401, "Nieprawidłowa nazwa lub PIN", "BAD_CREDENTIALS");
  }
  await createSession(c, user.id);
  return c.json({
    data: {
      id: user.id,
      username: user.username,
      role: user.role,
      active: user.active,
      createdAt: user.createdAt.toISOString(),
    },
  });
});

authRouter.post("/logout", async (c) => {
  await destroySession(c);
  return c.json({ data: { ok: true } });
});

authRouter.get("/me", async (c) => {
  const user = requireUser(c);
  return c.json({ data: user });
});

authRouter.patch(
  "/me",
  zValidator("json", LoginSchema),
  async (c) => {
    const user = requireUser(c);
    const { username, pin } = c.req.valid("json");

    const pinHash = await Bun.password.hash(pin);
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { username, pinHash },
    });

    return c.json({
      data: {
        id: updated.id,
        username: updated.username,
        role: updated.role,
        active: updated.active,
        createdAt: updated.createdAt.toISOString(),
      },
    });
  }
);

authRouter.post("/register", zValidator("json", LoginSchema), async (c) => {
  const { username, pin } = c.req.valid("json");

  // Check if username already exists
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    throw new HttpError(400, "Nazwa użytkownika już istnieje", "USERNAME_TAKEN");
  }

  const pinHash = await Bun.password.hash(pin);
  const user = await prisma.user.create({
    data: {
      username,
      pinHash,
      role: "PLAYER",
      active: true,
    },
  });

  await createSession(c, user.id);
  return c.json({
    data: {
      id: user.id,
      username: user.username,
      role: user.role,
      active: user.active,
      createdAt: user.createdAt.toISOString(),
    },
  });
});

export { authRouter };
