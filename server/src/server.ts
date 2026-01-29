import cors from "cors";
import board from "./routes/boards.js";
import cookieParser from "cookie-parser";
import cookieJwtAuth from "./middleware/cookieJwtAuth.js";
import jwt, { type JwtPayload } from "jsonwebtoken";
import express from "express";
import { usersRouter } from "./routes/users.js";

const PORT = process.env.PORT;
const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use("/api/boards", cookieJwtAuth, board);
app.use("/api/users", usersRouter);

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
