<stack>
  Bun runtime, Hono web framework, Zod validation.
</stack>

<structure>
  src/index.ts     — App entry, middleware, route mounting
  src/routes/      — Route modules (create as needed)
</structure>

<routes>
  Create routes in src/routes/ and mount them in src/index.ts.

  Example route file (src/routes/todos.ts):
  ```typescript
  import { Hono } from "hono";
  import { zValidator } from "@hono/zod-validator";
  import { z } from "zod";

  const todosRouter = new Hono();

  todosRouter.get("/", (c) => {
    return c.json({ todos: [] });
  });

  todosRouter.post(
    "/",
    zValidator("json", z.object({ title: z.string() })),
    (c) => {
      const { title } = c.req.valid("json");
      return c.json({ todo: { id: "1", title } });
    }
  );

  export { todosRouter };
  ```

  Mount in src/index.ts:
  ```typescript
  import { todosRouter } from "./routes/todos";
  app.route("/api/todos", todosRouter);
  ```

  IMPORTANT: Make sure all endpoints and routes are prefixed with `/api/`
</routes>

<shared_types>
  Define all API contracts in src/types.ts as Zod schemas.
  This file is the single source of truth — both backend and frontend import from here.
</shared_types>

<curl_testing>
  ALWAYS test APIs with cURL after implementing.
  Use $BACKEND_URL environment variable, never localhost.
  Verify response matches the Zod schema before telling frontend it's ready.
</curl_testing>

<database>
  Prisma (SQLite) IS configured. Schema: backend/prisma/schema.prisma.
  Models: User, Session, Match, Prediction, PointEntry, AppSetting.
  Client: src/prisma.ts. After schema changes run: bunx prisma db push (dev) / migrate deploy (prod).

  Auth is CUSTOM (not Better Auth): username + PIN (bcrypt via Bun.password), cookie sessions
  in src/auth.ts. Cookie is SameSite=None; Secure; Partitioned (works inside Vibecode iframe).
  Default admin (login admin / PIN 2026) is auto-created on empty DB by src/bootstrap.ts.

  Business rules live server-side:
  - src/helpers.ts isLocked(): typing closes at kickoff / on lockOverride / when finished.
  - src/helpers.ts computeSettlement(): exact-score-only pool scoring.
  - Settlement is idempotent (PointEntry wiped + recreated per match).
</database>