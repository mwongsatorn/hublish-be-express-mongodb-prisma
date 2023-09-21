import express from "express";
import cors from "cors"
import cookieParser from "cookie-parser";
import usersRoute from "./routes/user.route";

const app = express();

app.use(express.json());
app.use(cors())
app.use(cookieParser())

app.use("/api/users", usersRoute);

app.get("/", (req, res) => {
  res.send("Hello from express");
});

app.listen(8080);
