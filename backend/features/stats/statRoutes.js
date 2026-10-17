const express = require("express");
const router = express.Router();
const { incrementVisit, incrementLogin, getStats } = require("./statController");

router.post("/visit", incrementVisit);
router.post("/login", incrementLogin);
router.get("/overview", getStats);

module.exports = router;