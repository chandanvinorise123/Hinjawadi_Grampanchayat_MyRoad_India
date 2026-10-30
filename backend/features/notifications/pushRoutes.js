const express = require("express");
const mongoose = require("mongoose");
const PushDevice = require("../../models/PushDevice");
const { getMessaging } = require("../../services/firebaseMessaging");
const requirePushAuth = require("../../middleware/requirePushAuth");

const router = express.Router();

router.post("/devices", requirePushAuth, async (req, res) => {
  const token = typeof req.body?.token === "string" ? req.body.token.trim() : "";
  if (token.length < 20 || token.length > 4096) {
    return res.status(400).json({ success: false, message: "A valid Firebase device token is required." });
  }

  try {
    getMessaging();
    const device = await PushDevice.findOneAndUpdate(
      { token },
      {
        $set: {
          userId: req.pushUser._id,
          role: req.pushUser.role,
          lastRegisteredAt: new Date(),
        },
      },
      { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true }
    ).select("_id role");

    return res.json({ success: true, device: { id: String(device._id), role: device.role } });
  } catch (error) {
    if (error.code === 11000) {
      try {
        const device = await PushDevice.findOneAndUpdate(
          { token },
          {
            $set: {
              userId: req.pushUser._id,
              role: req.pushUser.role,
              lastRegisteredAt: new Date(),
            },
          },
          { returnDocument: "after", runValidators: true }
        ).select("_id role");
        if (device) {
          return res.json({ success: true, device: { id: String(device._id), role: device.role } });
        }
      } catch (retryError) {
        console.error("Push device registration retry failed:", retryError);
        return res.status(500).json({ success: false, message: "Unable to register this device." });
      }
    }
    console.error("Push device registration failed:", error);
    return res.status(503).json({ success: false, message: "Push service is not available. Please try again later." });
  }
});

router.delete("/devices/current", requirePushAuth, async (req, res) => {
  const token = typeof req.body?.token === "string" ? req.body.token.trim() : "";
  if (token.length < 20 || token.length > 4096) {
    return res.status(400).json({ success: false, message: "A valid Firebase device token is required." });
  }

  try {
    const result = await PushDevice.deleteOne({
      token,
      userId: new mongoose.Types.ObjectId(req.pushUser._id),
    });
    return res.json({ success: true, removed: result.deletedCount > 0 });
  } catch (error) {
    console.error("Push device removal failed:", error);
    return res.status(500).json({ success: false, message: "Unable to remove this device." });
  }
});

module.exports = router;
