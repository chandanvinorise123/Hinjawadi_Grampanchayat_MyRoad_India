
const mongoose = require("mongoose");
const Complaint = require("../models/Complaint");
const Notification = require("../models/Notification");
const departmentMapping = require("../constants/departmentMapping");
const { isInsideHinjawadiBoundary } = require("../utils/boundaryValidator");

// ==========================================
// HELPER: VALIDATE MONGODB OBJECT ID
// ==========================================
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

const PHOTO_LOCATION_TOLERANCE = 0.001;

// ==========================================
// HELPER: CHECK IF COMPLAINT CAN BE EDITED
// ==========================================
const canModifyComplaint = (status) => {
  const normalizedStatus = (status || "").toLowerCase().trim();

  return [
    "registered",
    "pending",
    "complaint registered",
    "new",
  ].includes(normalizedStatus);
};

// ==========================================
// 1. CREATE COMPLAINT
// ==========================================
const createComplaint = async (req, res) => {
  try {
    const {
      citizenId,
      citizenName,
      category,
      issueType,
      description,
      location,
      landmark,
      coordinates,
    } = req.body || {};

    // ------------------------------------------
    // Validate required fields
    // ------------------------------------------
    if (
      !citizenId ||
      !citizenName ||
      !category ||
      !issueType ||
      !description
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Citizen ID, category, issue type, and description are required",
      });
    }

    // ------------------------------------------
    // Validate citizen ID
    // ------------------------------------------
    if (!isValidObjectId(citizenId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid citizen ID",
      });
    }

    // ------------------------------------------
    // Validate category and assign department
    // ------------------------------------------
    const department = departmentMapping[category];

    if (!department) {
      return res.status(400).json({
        success: false,
        message: `No department mapped to category: ${category}`,
      });
    }

    // ------------------------------------------
    // Parse coordinates from FormData
    // ------------------------------------------
    let parsedCoordinates;

    if (coordinates) {
      try {
        parsedCoordinates =
          typeof coordinates === "string"
            ? JSON.parse(coordinates)
            : coordinates;
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: "Invalid coordinates format",
        });
      }
    }

    // ------------------------------------------
    // Validate coordinates
    // ------------------------------------------
    if (
      !parsedCoordinates ||
      parsedCoordinates.latitude === undefined ||
      parsedCoordinates.longitude === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Valid latitude and longitude coordinates are required",
      });
    }

    const latitude = Number(parsedCoordinates.latitude);
    const longitude = Number(parsedCoordinates.longitude);

    if (
      Number.isNaN(latitude) ||
      latitude < -90 ||
      latitude > 90
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid latitude",
      });
    }

    if (
      Number.isNaN(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid longitude",
      });
    }

    if (!isInsideHinjawadiBoundary(latitude, longitude)) {
      return res.status(400).json({
        success: false,
        message: "The complaint location must be inside Hinjawadi Gram Panchayat.",
      });
    }

    // ------------------------------------------
    // Get uploaded image paths
    // ------------------------------------------
    let photoVerifications = req.body.photoVerifications || [];
    if (typeof photoVerifications === "string") {
      try {
        photoVerifications = JSON.parse(photoVerifications);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: "Invalid photo verification data",
        });
      }
    }

    if (!Array.isArray(photoVerifications)) {
      return res.status(400).json({
        success: false,
        message: "Invalid photo verification data",
      });
    }

    const hasUploadedImages = Array.isArray(req.files) && req.files.length > 0;
    if (!hasUploadedImages && photoVerifications.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one verified complaint photo is required",
      });
    }

    for (const photo of photoVerifications) {
      const photoLatitude = Number(photo?.location?.latitude);
      const photoLongitude = Number(photo?.location?.longitude);
      if (!Number.isFinite(photoLatitude) || !Number.isFinite(photoLongitude)) {
        return res.status(400).json({
          success: false,
          message: "Each complaint photo must include GPS coordinates",
        });
      }
      if (!isInsideHinjawadiBoundary(photoLatitude, photoLongitude)) {
        return res.status(400).json({
          success: false,
          message: "The complaint photo location must be inside Hinjawadi Gram Panchayat.",
        });
      }
      if (
        Math.abs(photoLatitude - latitude) > PHOTO_LOCATION_TOLERANCE ||
        Math.abs(photoLongitude - longitude) > PHOTO_LOCATION_TOLERANCE
      ) {
        return res.status(400).json({
          success: false,
          message: "The complaint photo must be captured at the selected complaint location.",
        });
      }
    }

    const uploadedImages = (req.files || []).map(
      (file) => `/uploads/${file.filename}`
    );
    const verifiedImages = photoVerifications
      .map((photo) => photo.publicUrl)
      .filter((url) => typeof url === "string" && url.trim());
    const images = [...uploadedImages, ...verifiedImages].slice(0, 5);

    // ------------------------------------------
    // Create complaint
    // ------------------------------------------
    const complaint = await Complaint.create({
      citizenId,
      citizenName,
      category,
      issueType,
      description,
      location: location || "",
      landmark: landmark || "",
      department,
      coordinates: {
        latitude,
        longitude,
      },
      images,
      photos: images.length,
    });

    await Notification.insertMany([
      {
        role: "admin",
        complaintId: complaint._id,
        type: "Complaint Registered",
        message: `${complaint.complaintNumber} was registered and is ready for review.`,
      },
      {
        role: "verifier",
        complaintId: complaint._id,
        type: "Complaint Registered",
        message: `${complaint.complaintNumber} is ready for verification.`,
      },
    ]);

    return res.status(201).json({
      success: true,
      message: "Complaint registered successfully",
      data: complaint,
    });
  } catch (error) {
    console.error("Create complaint error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to register complaint",
      error: error.message,
    });
  }
};

// ==========================================
// 2. TRACK COMPLAINT
// ==========================================
const getComplaintById = async (req, res) => {
  try {
    const complaintId = req.params.complaintId?.trim();

    if (!complaintId) {
      return res.status(400).json({
        success: false,
        message: "Please enter a complaint number",
      });
    }

    let complaint = null;

    // ------------------------------------------
    // Search by MongoDB ObjectId
    // ------------------------------------------
    if (isValidObjectId(complaintId)) {
      complaint = await Complaint.findById(complaintId)
        .select("-__v");
    }

    // ------------------------------------------
    // Search by complaint number
    // ------------------------------------------
    if (!complaint) {
      complaint = await Complaint.findOne({
        complaintNumber: complaintId,
      }).select("-__v");
    }

    // ------------------------------------------
    // Complaint not found
    // ------------------------------------------
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message:
          "Complaint not found. Please check your complaint number.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Complaint found successfully",
      data: complaint,
    });
  } catch (error) {
    console.error("Track complaint error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to track complaint",
    });
  }
};

// ==========================================
// 3. GET MY COMPLAINTS
// ==========================================
const getMyComplaints = async (req, res) => {
  try {
    const { citizenId } = req.params;

    // ------------------------------------------
    // Validate citizen ID
    // ------------------------------------------
    if (!citizenId || !isValidObjectId(citizenId)) {
      return res.status(400).json({
        success: false,
        message: "Valid citizen ID is required",
      });
    }

    // ------------------------------------------
    // Get complaints belonging to citizen
    // ------------------------------------------
    const complaints = await Complaint.find({
      citizenId,
    })
      .sort({ createdAt: -1 })
      .select("-__v");

    // ------------------------------------------
    // Format data for CitizenDashboard.jsx
    // ------------------------------------------
    const formattedComplaints = complaints.map(
      (complaint) => ({
        id: complaint._id.toString(),

        _id: complaint._id,

        complaintNumber:
          complaint.complaintNumber ||
          complaint._id.toString(),

        category: complaint.category,

        // Frontend compatibility
        issue: complaint.issueType,
        issueType: complaint.issueType,

        description:
          complaint.description || "",

        location:
          complaint.location || "Location pending",

        landmark:
          complaint.landmark || "",

        coordinates:
          complaint.coordinates || null,

        status:
          complaint.status || "New",

        priority:
          complaint.priority || "Normal",

        department:
          complaint.department || "",

        images:
          complaint.images || [],

        photos:
          complaint.photos || 0,

        assignedStaff:
          complaint.assignedStaff || "",

        assignedVerifier:
          complaint.assignedVerifier || "",

        date: complaint.createdAt
          ? complaint.createdAt
              .toISOString()
              .slice(0, 10)
          : "",

        createdAt:
          complaint.createdAt,

        updatedAt:
          complaint.updatedAt,

        statusHistory:
          complaint.statusHistory || [],
      })
    );

    // ------------------------------------------
    // IMPORTANT:
    // Return 200 even when no complaints exist.
    // This prevents frontend JSON/404 problems.
    // ------------------------------------------
    return res.status(200).json({
      success: true,
      count: formattedComplaints.length,
      data: formattedComplaints,
    });
  } catch (error) {
    console.error(
      "Get my complaints error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch your complaints",
      error: error.message,
    });
  }
};

// ==========================================
// 4. UPDATE COMPLAINT
// ==========================================
const updateComplaint = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      citizenId,
      location,
      description,
    } = req.body || {};

    // ------------------------------------------
    // Validate complaint ID
    // ------------------------------------------
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid complaint ID",
      });
    }

    // ------------------------------------------
    // Validate citizen ID
    // ------------------------------------------
    if (
      !citizenId ||
      !isValidObjectId(citizenId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid citizen ID is required",
      });
    }

    // ------------------------------------------
    // Find complaint belonging to citizen
    // ------------------------------------------
    const complaint = await Complaint.findOne({
      _id: id,
      citizenId,
    });

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message:
          "Complaint not found for this citizen",
      });
    }

    // ------------------------------------------
    // Check whether complaint can be edited
    // ------------------------------------------
    if (!canModifyComplaint(complaint.status)) {
      return res.status(403).json({
        success: false,
        message:
          "This complaint can no longer be edited",
      });
    }

    // ------------------------------------------
    // Update location
    // ------------------------------------------
    if (location !== undefined) {
      complaint.location = location;
    }

    // ------------------------------------------
    // Update description
    // ------------------------------------------
    if (description !== undefined) {
      if (
        typeof description !== "string" ||
        !description.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "Description cannot be empty",
        });
      }

      complaint.description =
        description.trim();
    }

    await complaint.save();

    return res.status(200).json({
      success: true,
      message: "Complaint updated successfully",
      data: complaint,
    });
  } catch (error) {
    console.error(
      "Update complaint error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to update complaint",
      error: error.message,
    });
  }
};

// ==========================================
// 5. DELETE COMPLAINT
// ==========================================
const deleteComplaint = async (req, res) => {
  try {
    const { id } = req.params;

    const { citizenId } =
      req.body || {};

    // ------------------------------------------
    // Validate complaint ID
    // ------------------------------------------
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid complaint ID",
      });
    }

    // ------------------------------------------
    // Validate citizen ID
    // ------------------------------------------
    if (
      !citizenId ||
      !isValidObjectId(citizenId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid citizen ID is required",
      });
    }

    // ------------------------------------------
    // Find complaint belonging to citizen
    // ------------------------------------------
    const complaint = await Complaint.findOne({
      _id: id,
      citizenId,
    });

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message:
          "Complaint not found for this citizen",
      });
    }

    // ------------------------------------------
    // Check whether complaint can be deleted
    // ------------------------------------------
    if (!canModifyComplaint(complaint.status)) {
      return res.status(403).json({
        success: false,
        message:
          "This complaint can no longer be deleted",
      });
    }

    // ------------------------------------------
    // Delete complaint
    // ------------------------------------------
    await Complaint.deleteOne({
      _id: complaint._id,
    });

    return res.status(200).json({
      success: true,
      message: "Complaint deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete complaint error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to delete complaint",
      error: error.message,
    });
  }
};

// ==========================================
// EXPORT CONTROLLERS
// ==========================================
module.exports = {
  createComplaint,
  getComplaintById,
  getMyComplaints,
  updateComplaint,
  deleteComplaint,
};
