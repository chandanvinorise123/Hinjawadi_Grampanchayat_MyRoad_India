const express = require("express");
const router = express.Router();

// ✅ FIXED: Changed "../models/Map" to "../models/Complaint"
const Complaint = require("../models/Complaint");

// =====================================================
// ✅ ADDED: GET ALL COMPLAINTS FOR MAP (For Admin Dashboard)
// =====================================================
router.get("/complaints", async (req, res) => {
  try {
    const complaints = await Complaint.find({
      "location.coordinates": { $exists: true, $ne: [0, 0] }
    }).select("complaintNumber category issue location status priority citizenName date description photos");
    
    const formattedComplaints = complaints.map(c => ({
      ...c.toObject(),
      id: c._id,
      lat: c.location.coordinates[1],
      lng: c.location.coordinates[0]
    }));

    res.status(200).json({
      success: true,
      complaints: formattedComplaints
    });
  } catch (error) {
    console.error("Fetch map complaints error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch map complaints"
    });
  }
});

// GET /api/map/geocode?address=...
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

// PATCH /api/map/:id/location
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
          "location.coordinates": [lng, lat], // ✅ FIXED: Updated to match GeoJSON format
        },
      },
      {
        returnDocument: "after",
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