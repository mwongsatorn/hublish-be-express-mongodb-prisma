import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import usersRoute from "./routes/user.route";
import articlesRoute from "./routes/article.route";

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.use("/api/users", usersRoute);
app.use("/api/articles", articlesRoute);

app.get("/", (req, res) => {
  res.send("Hello from express");
});

app.listen(8080);
