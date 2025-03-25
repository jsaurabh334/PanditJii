const moment = require("moment");

// Predefined festival dates with surge multipliers
const festivalSurgePricing = {
    "2024-03-25": 1.5, // Example: Holi (50% increase)
    "2024-10-12": 2.0, // Example: Navratri (100% increase)
    "2024-11-04": 1.8, // Example: Diwali (80% increase)
    "2024-12-31": 1.3, // Example: New Year's Eve (30% increase)
};

// Function to get surge multiplier
const getSurgeMultiplier = (date) => {
    const formattedDate = moment(date).format("YYYY-MM-DD");

    // Check if the date is a festival
    if (festivalSurgePricing[formattedDate]) {
        return festivalSurgePricing[formattedDate];
    }

    // Check if it's a weekend (Saturday or Sunday)
    const dayOfWeek = moment(date).isoWeekday(); // 6 = Saturday, 7 = Sunday
    if (dayOfWeek === 6 || dayOfWeek === 7) {
        return 1.2; // 20% increase on weekends
    }

    // Default to no surge pricing
    return 1.0;
};

module.exports = { getSurgeMultiplier };
