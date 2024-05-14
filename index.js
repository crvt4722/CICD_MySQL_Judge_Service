import cors from "cors";
import express from "express";
import initWebRoute from "./src/routes/index.js";
import authenticateSequelize from "./src/models/orm/Sequelize.js";
import 'dotenv/config';
import schemaObject from "./src/setup/schema.js";
import bodyParser from "body-parser";

const PORT = parseInt(
  process.env.BACKEND_PORT || "8001",
  10,
);

const app = express();

app.use(cors({ origin: true }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

initWebRoute(app);

app.get("/", (req, res) => {
  res.status(200).send("Hello world!");
});

try {
  await authenticateSequelize();
} catch (error) {
  console.log(error.message);
}

await schemaObject.syncAllTable();

app.listen(PORT, () => {
  console.log("mysql-judge-service is running on port", PORT);
});
