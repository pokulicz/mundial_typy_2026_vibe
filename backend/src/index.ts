import "@vibecodeapp/proxy"; // DO NOT REMOVE OTHERWISE VIBECODE PROXY WILL NOT WORK
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import "./env";
import { authMiddleware, HttpError, type AppVariables } from "./auth";
import { authRouter } from "./routes/auth";
import { usersRouter } from "./routes/users";
import { matchesRouter } from "./routes/matches";
import { predictionsRouter } from "./routes/predictions";
import { settleRouter } from "./routes/settle";
import { rankingRouter } from "./routes/ranking";
import { bootstrapAdmin } from "./bootstrap";

await bootstrapAdmin();

const app = new Hono<{ Variables: AppVariables }>();

// CORS — echo specific allowed origin (credentials require non-wildcard)
const allowed = [
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
  /^https:\/\/[a-z0-9-]+\.dev\.vibecode\.run$/,
  /^https:\/\/[a-z0-9-]+\.vibecode\.run$/,
  /^https:\/\/[a-z0-9-]+\.vibecodeapp\.com$/,
  /^https:\/\/[a-z0-9-]+\.vibecode\.dev$/,
  /^https:\/\/vibecode\.dev$/,
];

app.use(
  "*",
  cors({
    origin: (origin) => (origin && allowed.some((re) => re.test(origin)) ? origin : null),
    credentials: true,
  })
);

app.use("*", logger());

// Centralized error handling -> { error: { message, code } }
app.onError((err, c) => {
  if (err instanceof HttpError) {
    return c.json({ error: { message: err.message, code: err.code } }, err.status as any);
  }
  console.error("Unhandled error:", err);
  return c.json({ error: { message: "Wystąpił błąd serwera", code: "INTERNAL" } }, 500);
});

// Auth middleware — populates c.var.user for all routes
app.use("*", authMiddleware);

app.get("/health", (c) => c.json({ status: "ok" }));

// Routes
app.route("/api/auth", authRouter);
app.route("/api/users", usersRouter);
app.route("/api/matches", matchesRouter);
app.route("/api/predictions", predictionsRouter);
app.route("/api/settle", settleRouter);
app.route("/api/ranking", rankingRouter);

const port = Number(process.env.PORT) || 3000;

export default {
  port,
  fetch: app.fetch,
};
