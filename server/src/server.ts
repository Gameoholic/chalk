import "./instrument.js";
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

const PORT = process.env.PORT;

const app = express();

app.use(
    cors({
        origin: process.env.ALLOWED_ORIGIN,
        credentials: true,
    })
);
app.use(express.json());
app.use(cookieParser());

app.use("/auth", authRouter);
app.use("/users", userRouter);
app.use("/guest-users", guestUserRouter);

app.use("/me", meRouter);
app.use("/me/boards", meBoardRouter);

Sentry.setupExpressErrorHandler(app);

// // Optional fallthrough error handler
// app.use(function onError(err, req, res, next) {
//     // The error id is attached to `res.sentry` to be returned
//     // and optionally displayed to the user for support.
//     res.statusCode = 500;
//     res.end(res.sentry + "\n");
// });

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
