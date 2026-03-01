import notifications from "#models/notifications.model";
import { authenticateAdmin } from "#Verification/access.token";
import type { Response, Request } from "express";
import { Router } from "express";
// for getting notifications
let NotificationRouter = Router();
// admin sending notification to users
let AdminNotificationRouter = Router();
// admin getting the notifications
let AdminGetNotificationRouter = Router();
// admin deleting notifications
let AdminDeleteNotificationRouter = Router();
// users getting notifications
NotificationRouter.get(
  "/",
  async (req: Request, res: Response): Promise<void> => {
    try {
      let notificationsList = await notifications
        .find({})
        .select("title content time");
      // getting the count of notifications
      let count = await notifications.countDocuments();
      res.status(200).json({
        data: notificationsList,
        count: count,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  },
);
//admin sending notifications
AdminNotificationRouter.post(
  "/",
  authenticateAdmin,
  async (req: Request, res: Response): Promise<void> => {
    let { title, content } = req.body;
    let adminEmail = req.cookies?.Q_user_1334G_XG;

    if (!title || !content) {
      res.status(400).json({ message: "Title and content are required" });
      return;
    }
    // Save notification to database
    let DateNow = new Date();
    let hrs = DateNow.getHours();
    let mins = DateNow.getMinutes();
    let day = null;
    switch (DateNow.getDay()) {
      case 0:
        day = "Sunday";
        break;
      case 1:
        day = "Monday";
        break;
      case 2:
        day = "Tuesday";
        break;
      case 3:
        day = "Wednesday";
        break;
      case 4:
        day = "Thursday";
        break;
      case 5:
        day = "Friday";
        break;
      case 6:
        day = "Saturday";
      default:
        break;
    }
    await notifications.create({
      from: `Admin ${adminEmail}`,
      title,
      content,
      time: `${day} ${hrs}:${mins} hrs`,
    });
    try {
      res.status(201).json({ message: "Notification sent successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to send notification" });
    }
  },
);
// admin getting the messages
AdminGetNotificationRouter.get(
  "/",
  authenticateAdmin,
  async (req: Request, res: Response): Promise<void> => {
    let adminEmail = req.cookies.Q_user_1334G_XG;
    if (!adminEmail) {
      res.status(401).json({ error: "Admin name is required" });
      return;
    }
    try {
      let notificationsList = await notifications
        .find({
          from: `Admin ${adminEmail}`,
        })
        .select("title content time -_id");
      res.status(200).json({
        data: notificationsList,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  },
);

// admin deleting notifications
AdminDeleteNotificationRouter.post(
  "/",
  authenticateAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.body;
    if (!id) {
      res.status(401).json({ error: "Id required" });
      return;
    }
    try {
      await notifications.findOneAndDelete({
        content: id,
      });
      res.status(200).json({ message: "Notifications deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete notifications" });
    }
  },
);
export {
  NotificationRouter,
  AdminNotificationRouter,
  AdminGetNotificationRouter,
  AdminDeleteNotificationRouter,
};
