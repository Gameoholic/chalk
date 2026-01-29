import jwt, {} from "jsonwebtoken";
export default function cookieJwtAuth(req, res, next) {
    try {
        const token = req.cookies.token;
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        console.log("Verified user " + payload.id);
        next();
    }
    catch (err) {
        res.clearCookie("token");
        return res.redirect("/");
    }
}
//# sourceMappingURL=cookieJwtAuth.js.map