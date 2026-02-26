// src/middleware/logger.ts
import morgan, { StreamOptions } from "morgan";
import { Request, Response } from "express";

// ---------------------------------------------------------------------
// 1. Custom token: request body (JSON only)
// ---------------------------------------------------------------------
morgan.token("req-body", (req: Request) => {
  if (!req.body || Object.keys(req.body).length === 0) return "-";
  try {
    return JSON.stringify(req.body);
  } catch {
    return "[invalid-json]";
  }
});

// ---------------------------------------------------------------------
// 2. Custom token: response body (JSON only)
// ---------------------------------------------------------------------
morgan.token("res-body", (_req: Request, res: Response) => {
  // `res.locals.body` will be filled by the wrapper below
  const body = (res as any).locals?.body;
  if (!body) return "-";
  try {
    return typeof body === "string" ? body : JSON.stringify(body);
  } catch {
    return "[invalid-json]";
  }
});

// ---------------------------------------------------------------------
// 3. Stream that writes to console (you can replace with a logger)
// ---------------------------------------------------------------------
const stream: StreamOptions = {
  write: (message: string) => process.stdout.write(message),
};

// ---------------------------------------------------------------------
// 4. Development format – includes req/res bodies
// ---------------------------------------------------------------------
const devFormat =
  ":method :url :status :res[content-length] - :response-time ms\n" +
  "   Req → :req-body\n" +
  "   Res → :res-body\n";

// ---------------------------------------------------------------------
// 5. Production format – same as before (no bodies)
// ---------------------------------------------------------------------
const prodFormat = "combined";

// ---------------------------------------------------------------------
// 6. Middleware that captures the JSON response body
// ---------------------------------------------------------------------
export const captureResponseBody = () => {
  return (req: Request, res: Response, next: Function) => {
    const oldJson = res.json;

    res.json = function (obj: any) {
      // Store the JSON payload so the morgan token can read it
      (res as any).locals = (res as any).locals || {};
      (res as any).locals.body = obj;
      return oldJson.call(this, obj);
    };

    next();
  };
};

// ---------------------------------------------------------------------
// 7. Exported logger – choose format based on NODE_ENV
// ---------------------------------------------------------------------
export const requestLogger = () => {
  const isDev = process.env.NODE_ENV === "development";

  return [
    // 1. Capture response body (must be BEFORE morgan)
    captureResponseBody(),
    // 2. Morgan with the chosen format
    morgan(isDev ? devFormat : prodFormat, { stream }),
  ];
};