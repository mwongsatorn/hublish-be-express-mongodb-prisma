import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import "dotenv/config";

interface UserRequest extends Request {
  id: string;
}
interface UserPayload extends jwt.JwtPayload {
  id: string;
}

export function validateAccessToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.headers["authorization"]) {
      res.status(401).send({ error: "No access token" });
      return;
    }

    const token = req.headers.authorization.split(" ")[1];
    const decoded = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_KEY!
    ) as UserPayload;
    (req as UserRequest).id = decoded.id;
    next();
  } catch (e) {
    res.status(401).send({ error: "Token expired" });
  }
}
