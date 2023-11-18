import { Request, Response, NextFunction } from "express";

export default function nocache() {
  return function nocache(_: Request, res: Response, next: NextFunction) {
    res.setHeader("Surrogate-Control", "no-store");
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    res.setHeader("Expires", "0");

    next();
  };
}
