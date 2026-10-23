const express = require("express");
const router = express.Router();

const ContactMessage = require("../../models/ContactMessage");
const Notification = require("../../models/Notification");

const allowedSubjects = new Set([
  "pothole",
  "safety",
  "waterlogging",
  "streetlight",
  "maintenance",
  "tracking",
  "project",
  "gis",
  "technical",
  "other",
]);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post("/", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const mobile = String(req.body.mobile || "").trim();
    const subject = String(req.body.subject || "").trim();
    const message = String(req.body.message || "").trim();

    if (!name || !email || !mobile || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: "Name, email, mobile, subject, and message are required.",
      });
    }

    if (name.length > 120 || email.length > 254 || mobile.length > 20 || message.length > 5000) {
      return res.status(400).json({
        success: false,
        message: "One or more fields exceed the allowed length.",
      });
    }

    if (!emailPattern.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid email address.",
      });
    }

    if (!allowedSubjects.has(subject)) {
      return res.status(400).json({
        success: false,
        message: "Select a valid contact subject.",
      });
    }

    const contactMessage = await ContactMessage.create({
      name,
      email,
      mobile,
      subject,
      message,
    });

    try {
      await Notification.create({
        role: "admin",
        type: "Contact Message Received",
        message: `${name} sent a contact message about ${subject}.`,
        contactMessageId: contactMessage._id,
      });
    } catch (error) {
      await ContactMessage.deleteOne({ _id: contactMessage._id });
      throw error;
    }

    return res.status(201).json({
      success: true,
      message: "Your message was sent successfully.",
      contactMessageId: String(contactMessage._id),
    });
  } catch (error) {
    console.error("Contact message submission error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to send your message right now. Please try again.",
    });
  }
});

module.exports = router;
