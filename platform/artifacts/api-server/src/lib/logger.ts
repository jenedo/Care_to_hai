import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";

const LOG_LEVEL = process.env.LOG_LEVEL ?? (isProduction ? "info" : "debug");

export const logger = pino({
  level: LOG_LEVEL,

  // Do not leak secrets / PHI in logs
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "req.headers['x-api-key']",
      "req.headers['x-access-token']",

      "res.headers['set-cookie']",

      "password",
      "oldPassword",
      "newPassword",
      "confirmPassword",

      "token",
      "accessToken",
      "refreshToken",
      "jwt",

      "otp",
      "otpCode",
      "verificationCode",

      "cnic",
      "cardNumber",
      "cvv",

      "*.password",
      "*.token",
      "*.accessToken",
      "*.refreshToken",
      "*.otp",
      "*.cnic",
      "*.cardNumber",
      "*.cvv",
    ],
    censor: "[REDACTED]",
  },

  base: {
    service: "asaancare-api",
    env: process.env.NODE_ENV ?? "development",
  },

  timestamp: pino.stdTimeFunctions.isoTime,

  ...(isProduction
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        },
      }),
});


// import pino from "pino";

// const isProduction = process.env.NODE_ENV === "production";

// export const logger = pino({
//   level: process.env.LOG_LEVEL ?? "info",
//   redact: [
//     "req.headers.authorization",
//     "req.headers.cookie",
//     "res.headers['set-cookie']",
//   ],
//   ...(isProduction
//     ? {}
//     : {
//         transport: {
//           target: "pino-pretty",
//           options: { colorize: true },
//         },
//       }),
// });
