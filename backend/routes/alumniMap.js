const express = require("express");
const router = express.Router();
const Profile = require("../models/user/profile.model");

// GET /api/alumni-map - Return alumni locations for map visualization
router.get("/", async (req, res) => {
  try {
    // Find all profiles with valid location coordinates
    // and populate the user to check if they're alumni
    const profilesWithLocations = await Profile.find({
      "location.coordinates.lat": { $exists: true, $ne: null },
      "location.coordinates.lng": { $exists: true, $ne: null },
    })
      .populate({
        path: "user",
        match: { role: "alumni" },
        select: "role",
      })
      .select("location");

    // Filter out profiles where user didn't match (not alumni or user deleted)
    const locations = profilesWithLocations
      .filter((profile) => profile.user !== null)
      .map((profile) => ({
        city: profile.location?.city || "Unknown",
        country: profile.location?.country || "Unknown",
        coordinates: profile.location?.coordinates || { lat: 0, lng: 0 },
      }));

    res.status(200).json({ locations });
  } catch (error) {
    console.error("Error fetching alumni map data:", error);
    res.status(200).json({ locations: [] });
  }
});

module.exports = router;
