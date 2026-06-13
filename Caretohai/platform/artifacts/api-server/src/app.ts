// old replit code 
// import express, { type Express } from "express";
// import cors from "cors";
// import cookieParser from "cookie-parser";
// import pinoHttp from "pino-http";
// import router from "./routes";
// import { logger } from "./lib/logger";
// import { errorHandler, notFoundHandler } from "./middlewares/errorHandler";

// const app: Express = express();

// app.use(
//   pinoHttp({
//     logger,
//     serializers: {
//       req(req) { return { id: req.id, method: req.method, url: req.url?.split("?")[0] }; },
//       res(res) { return { statusCode: res.statusCode }; },
//     },
//   }),
// );
// app.use(cors({ origin: true, credentials: true }));
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
// app.use(cookieParser());

// app.use("/api", router);

// app.use(notFoundHandler);
// app.use(errorHandler);

// export default app;


import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import router from "./routes";
import { logger } from "./lib/logger";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler";

const app: Express = express();

app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
}));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please try again later." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many auth attempts, please try again later." },
});

const allowedOrigins = [
  "http://localhost:5000",
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.ADMIN_WEB_URL,
  process.env.PATIENT_WEB_URL,
  process.env.DOCTOR_WEB_URL,
].filter(Boolean) as string[];

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (
        process.env.NODE_ENV !== "production" ||
        allowedOrigins.includes(origin)
      ) {
        callback(null, true);
        return;
      }

      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);

app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.use("/api/auth/mobile", authLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api", apiLimiter);
app.use("/api", router);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;


// new updated gpt code is above