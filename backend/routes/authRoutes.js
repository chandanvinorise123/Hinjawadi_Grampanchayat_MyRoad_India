const express = require("express");
const router = express.Router();

const User = require("../models/user");

const allowedRoles = ["citizen", "staff", "verifier", "admin"];

// Indian mobile number: 10 digits, starting with 6-9
const MOBILE_REGEX = /^[6-9]\d{9}$/;

// Fields sent back to the client for profile routes (never the password)
const publicUser = (u) => ({
    id: u._id,
    role: u.role,
    name: u.name,
    email: u.email,
    mobile: u.mobile,
    profilePhoto: u.profilePhoto || "",
    location: u.location,
    createdAt: u.createdAt
});

router.post("/signup", async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        const mobile = String(req.body.mobile || "").trim();

        if (!name || !email || !mobile || !password || !role) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        if (!MOBILE_REGEX.test(mobile)) {
            return res.status(400).json({
                success: false,
                message: "Enter a valid 10-digit mobile number"
            });
        }

        if (!allowedRoles.includes(role)) {
            return res.status(400).json({
                success: false,
                message: "Invalid role selected"
            });
        }

        const existingUser = await User.findOne({
            $or: [{ email }, { mobile }]
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message:
                    existingUser.email === email
                        ? "Email already registered"
                        : "Mobile number already registered"
            });
        }

        const newUser = new User({
            role,
            name,
            email,
            mobile,
            password
        });

        await newUser.save();

        res.status(201).json({
            success: true,
            message: "Account created successfully",
            user: {
                id: newUser._id,
                role: newUser.role,
                name: newUser.name,
                email: newUser.email,
                mobile: newUser.mobile,
                profilePhoto: newUser.profilePhoto || ""
            }
        });

    } catch (error) {
        console.error("Signup error:", error);

        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
});


router.post("/login", async (req, res) => {
    try {
        const { identifier, password, role } = req.body;

        if (!identifier || !password || !role) {
            return res.status(400).json({
                success: false,
                message: "Email or mobile number, password and role are required"
            });
        }

        // identifier can be an email address or a mobile number
        const user = await User.findOne({
            $or: [{ email: identifier }, { mobile: identifier }],
            role: role
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email/mobile, password or role"
            });
        }

        const isMatch = await user.comparePassword(password);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email/mobile, password or role"
            });
        }

        res.status(200).json({
            success: true,
            message: "Login successful",
            user: {
                id: user._id,
                role: user.role,
                name: user.name,
                email: user.email,
                mobile: user.mobile,
                profilePhoto: user.profilePhoto || ""
            }
        });

    } catch (error) {
        console.error("Login error:", error);

        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
});


router.get("/users", async (req, res) => {
    try {
        const users = await User.find().select("-password");

        res.status(200).json({
            success: true,
            users
        });

    } catch (error) {
        console.error("Get users error:", error);

        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
});

 
// GET /api/auth/users/:id  ->  get one user's profile
router.get("/users/:id", async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select("-password");
 
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }
 
        res.status(200).json({ success: true, user: publicUser(user) });
 
    } catch (error) {
        console.error("Get profile error:", error);
 
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
});
 
 
// PUT /api/auth/users/:id  ->  update name, email, mobile and location
router.put("/users/:id", async (req, res) => {
    try {
        const name = String(req.body.name || "").trim();
        const email = String(req.body.email || "").trim().toLowerCase();
        const mobile = String(req.body.mobile || "").trim();
        const location = String(req.body.location || "").trim();
 
        if (!name || !email || !mobile) {
            return res.status(400).json({
                success: false,
                message: "Name, email and mobile number are required"
            });
        }
 
        if (!MOBILE_REGEX.test(mobile)) {
            return res.status(400).json({
                success: false,
                message: "Enter a valid 10-digit mobile number"
            });
        }
 
        const duplicate = await User.findOne({
            $or: [{ mobile }, { email }],
            _id: { $ne: req.params.id }
        });
 
        if (duplicate) {
            return res.status(409).json({
                success: false,
                message: duplicate.email === email
                    ? "Email already registered"
                    : "Mobile number already registered"
            });
        }
 
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { name, email, mobile, location },
            { returnDocument: "after", runValidators: true }
        );
 
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }
 
        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            user: publicUser(user)
        });
 
    } catch (error) {
        console.error("Update profile error:", error);
 
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
});
 
 
// DELETE /api/auth/users/:id  ->  delete the account (body: { "password": "..." })
router.delete("/users/:id", async (req, res) => {
    try {
        const { password } = req.body;
 
        if (!password) {
            return res.status(400).json({
                success: false,
                message: "Password is required to delete your account"
            });
        }
 
        const user = await User.findById(req.params.id);
 
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }
 
        const isMatch = await user.comparePassword(password);
 
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Incorrect password"
            });
        }
 
        await User.findByIdAndDelete(user._id);
 
        res.status(200).json({
            success: true,
            message: "Account deleted successfully"
        });
 
    } catch (error) {
        console.error("Delete profile error:", error);
 
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
});
 
module.exports = router;
 
