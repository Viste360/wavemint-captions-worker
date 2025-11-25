import express from "express";
import cors from "cors";

import generateRoute from "./routes/generate.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/generate", generateRoute);

const PORT = process.env.PORT || 8081;
app.listen(PORT, () => {
  console.log("Caption worker running on port", PORT);
});
