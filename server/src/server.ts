import "./sentry-instrument.js";
import cors from "cors";
import cookieParser from "cookie-parser";
import cookieJwtAuth from "./middleware/auth.middleware.js";
import jwt, { type JwtPayload } from "jsonwebtoken";
import express from "express";
import * as Sentry from "@sentry/node";
import userRouter from "./routes/user.routes.js";
import guestUserRouter from "./routes/guest-user.routes.js";
import authRouter from "./routes/auth.routes.js";
import meBoardRouter from "./routes/me-board.routes.js";
import meRouter from "./routes/me.routes.js";
import globalErrorHandler from "./middleware/error.middleware.js";
import { env } from "./env.js";

const app = express();

app.use(
    cors({
        origin: env.ALLOWED_ORIGIN,
        credentials: true,
    })
);
app.use(express.json());
app.use(cookieParser());

app.use("/auth", authRouter);
app.use("/users", userRouter);
app.use("/guest-users", guestUserRouter);

app.use("/me", meRouter);

app.use(globalErrorHandler); // error handling middleware
Sentry.setupExpressErrorHandler(app);

app.listen(env.PORT, () => {
    console.log(`Server listening on port ${env.PORT}`);
});
