import { MongoClient, ServerApiVersion } from "mongodb";
import { env } from "../env.js";

const URI = env.ATLAS_URI!;
const client = new MongoClient(URI, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

try {
    // Connect the client to the server
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("chalk").command({ ping: 1 });
    console.log(
        "Pinged your deployment. You successfully connected to MongoDB!"
    );
} catch (err) {
    console.error(err);
    throw new Error("Couldn't connect to MongoDB database.");
}

const db = client.db("chalk");

export default db;
