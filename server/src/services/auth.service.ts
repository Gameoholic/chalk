import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import * as UserModel from "../models/user.model.js";

export async function login(email: string, password: string) {
    const user = await UserModel.findUserByEmail(email);
    if (!user) throw new Error("Invalid credentials");

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new Error("Invalid credentials");

    return jwt.sign(
        { id: user._id.toString(), email: user.email },
        process.env.JWT_SECRET!,
        { expiresIn: "10m" }
    );
}
