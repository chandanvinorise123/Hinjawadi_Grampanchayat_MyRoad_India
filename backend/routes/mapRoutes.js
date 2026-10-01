const express = require("express");
const router = express.Router();

const Complaint = require("../models/Map");

// GET /api/complaints/geocode?address=...
router.get("/geocode", async (req, res) => {
  try {
    const { address } = req.query;

    if (!address || !address.trim()) {
      return res.status(400).json({
        success: false,
        message: "Address required",
      });
    }

    const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!googleApiKey) {
      return res.status(500).json({
        success: false,
        message: "Google Maps API key is missing",
      });
    }

    const url =
      `https://maps.googleapis.com/maps/api/geocode/json?address=` +
      `${encodeURIComponent(address)}&key=${googleApiKey}`;

    const response = await fetch(url);

    if (!response.ok) {
      return res.status(502).json({
        success: false,
        message: "Google Geocoding service unavailable",
      });
    }

    const data = await response.json();

    if (data.status === "OK" && data.results.length > 0) {
      const location = data.results[0].geometry.location;

      return res.json({
        success: true,
        lat: location.lat,
        lng: location.lng,
        formattedAddress: data.results[0].formatted_address,
      });
    }

    return res.status(404).json({
      success: false,
      message: "Could not geocode address",
    });
  } catch (err) {
    console.error("Geocode error:", err);

    return res.status(500).json({
      success: false,
      message: "Geocoding failed",
    });
  }
});

// PATCH /api/complaints/:id/location
// Update complaint coordinates
router.patch("/:id/location", async (req, res) => {
  try {
    const { lat, lng } = req.body;

    if (
      typeof lat !== "number" ||
      typeof lng !== "number" ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid latitude and longitude are required",
      });
    }

    const complaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          lat,
          lng,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    return res.json({
      success: true,
      complaint,
    });
  } catch (err) {
    console.error("Location update error:", err);

    return res.status(500).json({
      success: false,
      message: "Failed to update location",
    });
  }
});

module.exports = router;