import cors from "cors";
import board from "./routes/board.js";
import cookieParser from "cookie-parser";
import cookieJwtAuth from "./middleware/cookieJwtAuth.js";
import jwt, { type JwtPayload } from "jsonwebtoken";
import express from "express";

const PORT = process.env.PORT;
const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());
//app.use(cookieJwtAuth);
app.use("/board", board);

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
