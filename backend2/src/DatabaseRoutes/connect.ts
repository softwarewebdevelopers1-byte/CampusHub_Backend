import { connect } from "mongoose";
export function DataBaseConnection() {
  let ConnectionString = process.env.MONGO_URI_LOCAL;
  if (ConnectionString) {
    connect(ConnectionString)
      .then(() => {
        console.log("Database connected successfully");
      })
      .catch(() => {
        console.log("Database connection failed");
        process.exit(1);
      });
  } else console.log("Unable to connect to the Database");
}
//# sourceMappingURL=connect.js.map
