import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import "dotenv/config";

interface UserRequest extends Request {
  id: string;
}
interface UserPayload extends jwt.JwtPayload {
  id: string;
}

export function requireLogin(req: Request, res: Response, next: NextFunction) {
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
    return next();
  } catch (e) {
    if (e instanceof jwt.JsonWebTokenError)
      return res.status(401).send({ error: "Invalid token." });
    if (e instanceof jwt.TokenExpiredError)
      return res.status(401).send({ error: "Token expired." });
  }
}
