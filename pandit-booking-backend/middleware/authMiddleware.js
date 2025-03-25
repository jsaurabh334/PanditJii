const jwt = require("jsonwebtoken");

// ✅ Authentication Middleware
const authMiddleware = (req, res, next) => {
    let token = req.header("Authorization");
    if (!token) return res.status(401).json({ error: "Access Denied" });

    // Handle "Bearer " prefix if present
    if (token.startsWith("Bearer ")) {
        token = token.slice(7);
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ error: "Invalid or Expired Token" });
    }
};

// ✅ Role-Based Access Middleware
const roleMiddleware = (roles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(403).json({ error: "Access Denied" });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: "Insufficient Permissions" });
        }
        next();
    };
};

module.exports = { authMiddleware, roleMiddleware };

