const express = require("express");
const router = express.Router();
const axios = require("axios");
const { protect } = require("../middleware/auth");

const NOMINATIM_URL = "https://nominatim.openstreetmap.org";

// POST /api/geocode/reverse - Reverse geocode coordinates to city/country
router.post("/reverse", protect, async (req, res) => {
  try {
    const { lat, lng } = req.body;
    if (!lat || !lng) {
      return res
        .status(400)
        .json({ error: "Latitude and longitude are required" });
    }

    const response = await axios.get(`${NOMINATIM_URL}/reverse`, {
      params: { lat, lon: lng, format: "json" },
      headers: { "User-Agent": "NSUT-Alumni-Network/1.0" },
    });

    const data = response.data;
    const city =
      data.address.city || data.address.town || data.address.village || "";
    const country = data.address.country || "";

    res.status(200).json({ city, country });
  } catch (error) {
    console.error("Reverse geocoding error:", error);
    res.status(500).json({ error: "Failed to reverse geocode location" });
  }
});

module.exports = router;
