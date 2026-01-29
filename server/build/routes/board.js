import express from "express";
import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";
// router is an instance of the express router.
// We use it to define our routes.
// The router will be added as a middleware and will take control of requests starting with path /record.
const router = express.Router();
// This section will help you get a list of all the records.
router.get("/", async (req, res) => {
    // let collection = await db.collection("boards");
    // let results = await collection.find({}).toArray();
    const payload = {
        id: "userid",
        username: "optional..",
        metadata: "sample",
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: "10m",
    });
    res.cookie("token", token);
    res.status(403).json({ error: "test" });
    // res.send(results).status(200);
});
export default router;
//# sourceMappingURL=board.js.map