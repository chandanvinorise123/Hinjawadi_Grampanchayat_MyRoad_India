const mongoose = require("mongoose");
const Complaint = require("../models/Complaint");
const departmentMapping = require("../constants/departmentMapping");

// ==========================================
// HELPER: VALIDATE MONGODB OBJECT ID
// ==========================================
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

// ==========================================
// HELPER: CHECK IF COMPLAINT CAN BE EDITED
// ==========================================
const canModifyComplaint = (status) => {
  const normalizedStatus = (status || "")
    .toLowerCase()
    .trim();

  return [
    "registered",
    "pending",
    "complaint registered",
  ].includes(normalizedStatus);
};

// ==========================================
// 1. CREATE COMPLAINT
// ==========================================
const createComplaint = async (req, res) => {
  try {
    const {
      citizenId,
      category,
      issueType,
      description,
      location,
      landmark,
      coordinates,
    } = req.body || {};

    // Validate required fields
    if (!citizenId || !category || !issueType || !description) {
      return res.status(400).json({
        success: false,
        message:
          "Citizen ID, category, issue type, and description are required",
      });
    }

    // Validate citizen ID
    if (!isValidObjectId(citizenId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid citizen ID",
      });
    }

    // Validate category and assign department
    const department = departmentMapping[category];

    if (!department) {
      return res.status(400).json({
        success: false,
        message: `No department mapped to category: ${category}`,
      });
    }

    // Parse coordinates from FormData
    let parsedCoordinates;

    if (coordinates) {
      try {
        parsedCoordinates =
          typeof coordinates === "string"
            ? JSON.parse(coordinates)
            : coordinates;
      } catch {
        return res.status(400).json({
          success: false,
          message: "Invalid coordinates format",
        });
      }
    }

    // Get uploaded image paths
    const images = (req.files || []).map(
      (file) => `/uploads/${file.filename}`
    );

    // Create complaint
    const complaint = await Complaint.create({
      citizenId,
      category,
      issueType,
      description,
      department,
      location,
      landmark,
      coordinates: parsedCoordinates,
      images,
    });

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

    // Search by MongoDB ID
    if (isValidObjectId(complaintId)) {
      complaint = await Complaint.findById(complaintId)
        .select("-__v");
    }

    // Search by complaint number, if available
    if (
      !complaint &&
      Complaint.schema.path("complaintNumber")
    ) {
      complaint = await Complaint.findOne({
        complaintNumber: complaintId,
      }).select("-__v");
    }

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

    if (!citizenId || !isValidObjectId(citizenId)) {
      return res.status(400).json({
        success: false,
        message: "Valid citizen ID is required",
      });
    }

    const complaints = await Complaint.find({ citizenId })
      .sort({ createdAt: -1 })
      .select("-__v");

    // Format data for CitizenDashboard.jsx
    const formattedComplaints = complaints.map((complaint) => ({
      id: complaint._id.toString(),
      _id: complaint._id,
      complaintNumber:
        complaint.complaintNumber ||
        complaint._id.toString(),
      category: complaint.category,
      issue: complaint.issueType,
      issueType: complaint.issueType,
      location: complaint.location || "Location pending",
      description: complaint.description,
      status: complaint.status || "Registered",
      date: complaint.createdAt
        ? complaint.createdAt.toISOString().slice(0, 10)
        : "",
      createdAt: complaint.createdAt,
      department: complaint.department,
      images: complaint.images || [],
      landmark: complaint.landmark,
      coordinates: complaint.coordinates,
    }));

    return res.status(200).json({
      success: true,
      count: formattedComplaints.length,
      data: formattedComplaints,
    });
  } catch (error) {
    console.error("Get my complaints error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch your complaints",
    });
  }
};

// ==========================================
// 4. UPDATE COMPLAINT
// ==========================================
const updateComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const { citizenId, location, description } = req.body || {};

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid complaint ID",
      });
    }

    if (!citizenId || !isValidObjectId(citizenId)) {
      return res.status(400).json({
        success: false,
        message: "Valid citizen ID is required",
      });
    }

    const complaint = await Complaint.findOne({
      _id: id,
      citizenId,
    });

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found for this citizen",
      });
    }

    if (!canModifyComplaint(complaint.status)) {
      return res.status(403).json({
        success: false,
        message:
          "This complaint can no longer be edited",
      });
    }

    // Update only the permitted fields
    if (location !== undefined) {
      complaint.location = location;
    }

    if (description !== undefined) {
      if (!description.trim()) {
        return res.status(400).json({
          success: false,
          message: "Description cannot be empty",
        });
      }

      complaint.description = description;
    }

    await complaint.save();

    return res.status(200).json({
      success: true,
      message: "Complaint updated successfully",
      data: complaint,
    });
  } catch (error) {
    console.error("Update complaint error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update complaint",
    });
  }
};

// ==========================================
// 5. DELETE COMPLAINT
// ==========================================
const deleteComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const { citizenId } = req.body || {};

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid complaint ID",
      });
    }

    if (!citizenId || !isValidObjectId(citizenId)) {
      return res.status(400).json({
        success: false,
        message: "Valid citizen ID is required",
      });
    }

    const complaint = await Complaint.findOne({
      _id: id,
      citizenId,
    });

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found for this citizen",
      });
    }

    if (!canModifyComplaint(complaint.status)) {
      return res.status(403).json({
        success: false,
        message:
          "This complaint can no longer be deleted",
      });
    }

    await Complaint.deleteOne({ _id: complaint._id });

    return res.status(200).json({
      success: true,
      message: "Complaint deleted successfully",
    });
  } catch (error) {
    console.error("Delete complaint error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete complaint",
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