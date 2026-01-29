import cors from "cors";
import board from "./routes/boards.js";
import cookieParser from "cookie-parser";
import cookieJwtAuth from "./middleware/auth.middleware.js";
import jwt, { type JwtPayload } from "jsonwebtoken";
import express from "express";
import userRouter from "./routes/user.routes.js";
import authRouter from "./routes/auth.routes.js";

const PORT = process.env.PORT;
const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
