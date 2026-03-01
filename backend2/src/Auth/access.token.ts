import jwt from "jsonwebtoken";
import type { Response, Request, NextFunction } from "express";
import type { JwtLoad } from "#JwtPayloadInterface/jwt";
// creating type alias type explicit
type tokens = string;
// function for creating an access token
function generateAccessToken(req: Request): tokens {
  // casting user to string
  let User: JwtLoad = { name: req.body.email };
  // getting the .env file variable
  const AccessTokenSecret = process.env.ACCESS_TOKEN_SECRET;
  // checking if the variable exists in the .env file
  if (AccessTokenSecret) {
    // assigning user to an access token
    const AccessToken = jwt.sign(User, AccessTokenSecret, {
      expiresIn: "15m",
    });
    return AccessToken;
  } else {
    return "No token";
  }
}
// generating access token
function generateRefreshToken(req: Request): tokens {
  let User = { name: req.body.email };
  const RefreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;
  if (RefreshTokenSecret) {
    let RefreshToken = jwt.sign(User, RefreshTokenSecret, { expiresIn: "7d" });
    return RefreshToken;
  } else {
    return "No token";
  }
}
// validating the access token for protected routes
function AuthenticateToken(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const accessToken = req.cookies?.CampusHub7U4D_Host_AccessToken;
  // const Device = req.cookies?.Host_AU1_Auth_2Wa__DeviceId;
  // let email = req.cookies?.user_1UA_XG;
  const accessSecret = process.env.ACCESS_TOKEN_SECRET;
  try {
    if (!accessSecret) {
      res
        .status(500)
        .json({ success: false, error: "Server secret configuration missing" });
      return;
    }

    if (!accessToken) {
      res
        .status(401)
        .json({ success: false, error: "Unauthorized: No token provided" });
      return;
    }

    jwt.verify(accessToken, accessSecret, (err: unknown, user: unknown) => {
      if (err) {
        res
          .status(403)
          .json({ success: false, error: "Unable to verify token" });
        return;
      }
      req.user = user as JwtLoad;
      next();
    });
  } catch (error) {
    res.status(401).json({ error: "Unable to load tokens" });
  }
}
function authenticateAdmin(req: Request, res: Response, nxt: NextFunction) {
  let AdminToken = req.cookies?.dCa_Host_AccessToken;
  let RawAccessToken = process.env.ACCESS_TOKEN_SECRET;
  try {
    if (!AdminToken || !RawAccessToken) {
      res.status(401).json({ error: "Invalid Admin token" });
      return;
    }
    jwt.verify(AdminToken, RawAccessToken, (err: unknown, Payload: unknown) => {
      if (err) {
        res.status(401).json({ error: "Invalid Admin token" });
        return;
      }
      req.user = Payload as JwtLoad;
      nxt();
    });
  } catch (error) {
    res.status(401).json({ error: "Invalid Admin token" });
  }
}

export {
  AuthenticateToken,
  generateAccessToken,
  generateRefreshToken,
  authenticateAdmin,
};
//# sourceMappingURL=access.token.js.map
