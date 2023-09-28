import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import "dotenv/config";

interface UserRequest extends Request {
  username: string;
}
interface UserPayload extends jwt.JwtPayload {
  username: string
}

export function validateAccessToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.headers["authorization"]) {
      res.status(401).send({ status: false, error: "Unauthorized" });
      return;
    }

    const token = req.headers.authorization.split(" ")[1];
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_KEY!) as UserPayload
    (req as UserRequest).username = decoded.username;
    next();
  } catch (e) {
    res.status(403).send({ status: false, error: "Forbidden" });
  }
}
