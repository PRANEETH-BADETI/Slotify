const express = require("express");
const adminRoutes = require("./adminRoutes");
const publicRoutes = require("./publicRoutes");

const router = express.Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

router.use("/admin", adminRoutes);
router.use("/public", publicRoutes);

module.exports = router;
