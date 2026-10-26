const express = require("express");
const mongoose = require("mongoose");
const Complaint = require("../../models/Complaint");
const BlogImageEngagement = require("../../models/BlogImageEngagement");

const router = express.Router();

const isValidClientId = (clientId) =>
  typeof clientId === "string" && /^[a-zA-Z0-9-]{8,100}$/.test(clientId);

const getImage = async (complaintId, imageIndex) => {
  if (!mongoose.Types.ObjectId.isValid(complaintId)) return null;
  if (!Number.isInteger(imageIndex) || imageIndex < 0) return null;

  const complaint = await Complaint.findOne({
    _id: complaintId,
    status: { $ne: "Rejected" },
  })
    .select("images")
    .lean();

  if (!complaint || !complaint.images?.[imageIndex]) return null;
  return complaint.images[imageIndex];
};

router.get("/feed", async (req, res) => {
  try {
    const { clientId } = req.query;
    if (!isValidClientId(clientId)) {
      return res.status(400).json({ success: false, message: "A valid client ID is required." });
    }

    const [complaintData] = await Complaint.aggregate([
      { $match: { status: { $ne: "Rejected" } } },
      {
        $facet: {
          imageComplaints: [
            { $match: { images: { $exists: true, $ne: [] } } },
            { $sort: { createdAt: -1 } },
            {
              $project: {
                complaintNumber: 1,
                category: 1,
                issueType: 1,
                location: 1,
                status: 1,
                priority: 1,
                images: 1,
                inspection: 1,
                createdAt: 1,
              },
            },
          ],
          statusCounts: [
            {
              $group: {
                _id: { $toLower: { $ifNull: ["$status", "new"] } },
                count: { $sum: 1 },
              },
            },
          ],
        },
      },
    ]);
    const complaints = complaintData?.imageComplaints || [];
    const groupedStatusCounts = new Map(
      (complaintData?.statusCounts || []).map(({ _id, count }) => [_id, count])
    );
    const statusCounts = {
      registered: ["new", "submitted", "pending", "under review", "under verification", "verified", "registered"]
        .reduce((total, status) => total + (groupedStatusCounts.get(status) || 0), 0),
      assigned: groupedStatusCounts.get("assigned") || 0,
      underAction: (groupedStatusCounts.get("under action") || 0) +
        (groupedStatusCounts.get("in progress") || 0),
      resolved: (groupedStatusCounts.get("resolved") || 0) +
        (groupedStatusCounts.get("closed") || 0),
    };

    const complaintIds = complaints.map((complaint) => complaint._id);
    const engagements = complaintIds.length
      ? await BlogImageEngagement.find({ complaintId: { $in: complaintIds } })
          .select("complaintId imageIndex likes thumbs comments")
          .lean()
      : [];

    const engagementByImage = new Map(
      engagements.map((item) => [
        `${item.complaintId}:${item.imageIndex}`,
        item,
      ])
    );

    const images = complaints.flatMap((complaint) =>
      (complaint.images || []).filter(Boolean).map((url, imageIndex) => {
        const engagement = engagementByImage.get(
          `${complaint._id}:${imageIndex}`
        );
        const likes = engagement?.likes || [];
        const thumbs = engagement?.thumbs || [];
        const comments = (engagement?.comments || []).map((comment) => ({
          text: comment.text,
          createdAt: comment.createdAt,
        }));

        return {
          id: `${complaint._id}:${imageIndex}`,
          complaintId: complaint._id,
          imageIndex,
          imageUrl: url,
          complaintNumber: complaint.complaintNumber,
          category: complaint.category,
          issueType: complaint.issueType,
          location: complaint.location,
          status: complaint.status,
          priority: complaint.priority,
          createdAt: complaint.createdAt,
          afterImageUrl:
            complaint.inspection?.completionPhoto ||
            complaint.inspection?.verificationPhoto ||
            "",
          hearts: likes.length,
          heartedByClient: likes.includes(clientId),
          thumbs: thumbs.length,
          thumbedByClient: thumbs.includes(clientId),
          comments: comments.slice(-5),
          commentCount: comments.length,
        };
      })
    );

    return res.status(200).json({ success: true, images, statusCounts });
  } catch (error) {
    console.error("Blog image feed error:", error);
    return res.status(500).json({ success: false, message: "Failed to load reported images." });
  }
});

router.patch("/feed/:complaintId/:imageIndex/like", async (req, res) => {
  try {
    const { clientId, action, reaction } = req.body || {};
    const imageIndex = Number(req.params.imageIndex);

    if (
      !isValidClientId(clientId) ||
      !["like", "unlike"].includes(action) ||
      !["thumb", "heart"].includes(reaction)
    ) {
      return res.status(400).json({ success: false, message: "A valid client ID, reaction, and like action are required." });
    }

    if (!(await getImage(req.params.complaintId, imageIndex))) {
      return res.status(404).json({ success: false, message: "Reported image not found." });
    }

    const reactionField = reaction === "thumb" ? "thumbs" : "likes";
    const update = action === "like"
      ? { $addToSet: { [reactionField]: clientId }, $setOnInsert: { complaintId: req.params.complaintId, imageIndex } }
      : { $pull: { [reactionField]: clientId }, $setOnInsert: { complaintId: req.params.complaintId, imageIndex } };

    const engagement = await BlogImageEngagement.findOneAndUpdate(
      { complaintId: req.params.complaintId, imageIndex },
      update,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).select("likes thumbs");

    return res.status(200).json({
      success: true,
      hearts: (engagement.likes || []).length,
      heartedByClient: (engagement.likes || []).includes(clientId),
      thumbs: (engagement.thumbs || []).length,
      thumbedByClient: (engagement.thumbs || []).includes(clientId),
    });
  } catch (error) {
    console.error("Blog image like update error:", error);
    return res.status(500).json({ success: false, message: "Failed to update the like." });
  }
});

router.post("/feed/:complaintId/:imageIndex/comments", async (req, res) => {
  try {
    const { clientId, text } = req.body || {};
    const imageIndex = Number(req.params.imageIndex);
    const comment = typeof text === "string" ? text.trim() : "";

    if (!isValidClientId(clientId) || !comment || comment.length > 500) {
      return res.status(400).json({
        success: false,
        message: "A valid client ID and a comment between 1 and 500 characters are required.",
      });
    }

    if (!(await getImage(req.params.complaintId, imageIndex))) {
      return res.status(404).json({ success: false, message: "Reported image not found." });
    }

    await BlogImageEngagement.findOneAndUpdate(
      { complaintId: req.params.complaintId, imageIndex },
      {
        $push: {
          comments: {
            $each: [{ clientId, text: comment, createdAt: new Date() }],
            $slice: -200,
          },
        },
        $setOnInsert: { complaintId: req.params.complaintId, imageIndex },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(201).json({ success: true });
  } catch (error) {
    console.error("Blog image comment error:", error);
    return res.status(500).json({ success: false, message: "Failed to save the comment." });
  }
});

module.exports = router;
