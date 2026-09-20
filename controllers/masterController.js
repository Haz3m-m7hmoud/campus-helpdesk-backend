const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 1. Get all categories
const getCategories = async (req, res) => {
    try {
        const categories = await prisma.cATEGORY.findMany();
        res.status(200).json({ success: true, count: categories.length, data: categories });
    } catch (error) {
        console.error("Error fetching categories:", error);
        res.status(500).json({ success: false, message: "Error fetching categories" });
    }
};

// 2. Get all locations (Rooms/Floors)
const getLocations = async (req, res) => {
    try {
        const locations = await prisma.lOCATION.findMany();
        res.status(200).json({ success: true, count: locations.length, data: locations });
    } catch (error) {
        console.error("Error fetching locations:", error);
        res.status(500).json({ success: false, message: "Error fetching locations" });
    }
};

module.exports = {
    getCategories,
    getLocations
};