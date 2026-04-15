const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const routes = require("./routes");
const { env } = require("./config/env");
const { errorHandler, notFoundHandler } = require("./middlewares/errorHandler");

const app = express();

app.use(
  cors({
    origin: env.clientUrl,
  })
);
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());

app.use("/api", routes);
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = { app };
