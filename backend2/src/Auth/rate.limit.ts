import rateLimit from "express-rate-limit";
export function loginLimit() {
  return rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    message: "Too many requests, please try again later.",
    statusCode: 429,
    standardHeaders: true,
    legacyHeaders: false,
  });
}
export function loginAdminLimit() {
  return rateLimit({
    windowMs: 60 * 1000,
    max: 2,
    handler: (req, res) => {
      res
        .status(429)
        .json({ error: "Too many requests, please try again later." });
    },
    statusCode: 429,
    standardHeaders: true,
    legacyHeaders: false,
  });
}
export function signUpLimit() {
  return rateLimit({
    windowMs: 60 * 1000,
    max: 3,
    message: "Too many accounts created, try again later.",
    statusCode: 429,
    standardHeaders: true,
    legacyHeaders: false,
  });
}
export function AISummaryLimit() {
  return rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    message: "Too many requests, please try again later.",
    statusCode: 429,
    standardHeaders: true,
    legacyHeaders: false,
  });
}
// export function globaLimit() {
//     return rateLimit({
//         windowMs: 60 * 1000,
//         max: 30,
//         message: "Too many requests, please try again later.",
//         statusCode: 429,
//         standardHeaders: true,
//         legacyHeaders: false,
//     });
// }
export function OTPLimit() {
  return rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    message: "Too many requests, please try again later.",
    statusCode: 429,
    standardHeaders: true,
    legacyHeaders: false,
  });
}
//# sourceMappingURL=rate.limit.js.map
