import express from "express";
import type { Response, Request, NextFunction } from "express";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import { DataBaseConnection } from "#DatabaseConnectionModule/connect";
import { logRouter } from "#authentication/login";
import { signUpRouter } from "#authentication/sign_up";
import { pdfRouter } from "#PdfResources/upload.AI.pdf";
import { OTPRouter } from "#Verification/OTP.verify";
import { RefreshRouter } from "#Verification/refreshToken";
import IsLoggedRoute from "#authentication/is_logged";
import LogoutRouter from "#authentication/logout";
import LogOutAll from "#authentication/logOutAll";
import { LogAdminRouter } from "#authentication/adminLogin";
import IsAdminLogged from "#authentication/Is_admin_logged";
import { AdminLogOut, AdminLogOutAll } from "#authentication/logoutAdmin";
import { GetUsers, UserNumber } from "#adminResources/getUsers";
import { UserDeleteRoute } from "#authentication/user.delete";
import RecoverUsers from "#adminResources/recover_users";
import {
  AdminDeleteNotificationRouter,
  AdminGetNotificationRouter,
  AdminNotificationRouter,
  NotificationRouter,
} from "#adminResources/public_notifications";
// users uploads
import { UserUploadRouter } from "#PdfResources/USER.UPLOAD";
import { deepSearchRouter } from "#PdfResources/deepSearch.user";
import { usersGetOwnPDF } from "#PdfResources/users.getPDF";
import { simpleSearchRoute } from "#PdfResources/simple.search";
import { LecturerCreateAccount } from "./lecturer_resources/Lecture_create_Account.js";
import { LecturerLoginRoute } from "./lecturer_resources/lecturer_login_Account.js";
import { GetLecturers, LecturerNumber } from "#adminResources/getLec";
import IsLecturerLogged from "#authentication/is_lecturer_logged";
// import { globaLimit } from "#Verification/rate.limit";
dotenv.config();
let PORT = Number(process.env.DEV_PORT) || Number(process.env.PORT);
DataBaseConnection();
let App = express();
// allow every user to be treated independantly when dealing with limiting
App.set("trust proxy", 1);
App.use(cookieParser());
// App.use(globaLimit());
App.use(express.json());
App.use(
  cors({
    origin: [
      "https://campushub-mq9h.onrender.com",
      "https://campus-hub-frontend-lime.vercel.app",
      "http://localhost:5173",
      "http://localhost:5500",
    ],

    allowedHeaders: ["authorization", "Content-Type"],
    credentials: true,
  }),
);
// authorization routes
App.use("/auth/login", logRouter);
App.use("/auth/signUp", signUpRouter);
App.use("/auth/logout", LogoutRouter);
App.use("/auth/all/logout", LogOutAll);
App.use("/auth/recover/account", RecoverUsers);
App.use("/auth/delete/account", UserDeleteRoute);
App.use("/auth/verify/refresh", RefreshRouter);
App.use("/auth/check/logged", IsLoggedRoute);
App.use("/api/resource/pdf", pdfRouter);
App.use("/auth/verify-otp", OTPRouter);
App.use("/auth/find/users", GetUsers);
App.use("/auth/logout/admin/logout", AdminLogOut);
App.use("/auth/check/admin/logged", IsAdminLogged);
App.use("/auth/all/admin/logout/all", AdminLogOutAll);
App.use("/auth/verify/admin", LogAdminRouter);
// lecturer routes
// checking if lecturer is logged in
App.use("/auth/lecturer/check/logged", IsLecturerLogged);
// lecturer number
App.use("/auth/lecturer/get/number", LecturerNumber);
// lecturer accounts
App.use("/auth/lecturer/get/accounts", GetLecturers);
// lecturer login route
App.use("/auth/lecturer/login/account", LecturerLoginRoute);
// lecturer create account route
App.use("/auth/lecturer/create/account", LecturerCreateAccount);
// router for getting number of users in the database
App.use("/api/count/log/users", UserNumber);
// router for notifications
App.use("/api/public/notifications", NotificationRouter);
App.use("/api/admin/delete/notification", AdminDeleteNotificationRouter);
App.use("/api/admin/get/notifications", AdminGetNotificationRouter);
App.use("/api/admin/send/notifications", AdminNotificationRouter);
// uploading pdf
App.use("/api/resources/upload/users/data/pdf", UserUploadRouter);
// getting pdf
App.use("/api/resources/get/pdf/users", deepSearchRouter);
App.use("/api/resources/pdf/users/simple/search", simpleSearchRoute);
App.use("/api/users/get/own/pdfs", usersGetOwnPDF);
App.use(
  (err: unknown, req: Request, res: Response, next: NextFunction): void => {
    if (
      err instanceof SyntaxError &&
      "status" in err &&
      err.message.includes("JSON")
    ) {
      res.status(400).json({
        success: false,
        message:
          "Malformed JSON: Please check your syntax (brackets, commas, etc.)",
      });
      return;
    }
    next();
  },
);
App.use((req, res, nxt): Response => {
  return res.status(404).json({ error: "Route not found" });
  nxt();
});
const server = App.listen(PORT, () => {
  console.log(`Server started...\nhttp://localhost:${PORT}...`);
});
const gracefulShutdown = async (signal: string): Promise<void> => {
  console.log(`\n${signal} received...\nStarting graceful shutdown...`);
  server.close(async () => {
    console.log("HTTP server closed.");
    try {
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.close();
        console.log("MongoDB connection closed.");
      }
    } catch (err) {
      console.error("Error during shutdown:", err);
    } finally {
      console.log("Safe exit complete.");
      process.exit(0);
    }
  });
};
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
//# sourceMappingURL=server.js.map
