const express = require("express");
const router = express.Router();

const User = require("../models/user");

router.post("/signup", async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const role = "citizen";

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Email already registered"
            });
        }

        const newUser = new User({
            role,
            name,
            email,
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
                email: newUser.email
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
                message: "Username/email, password and role are required"
            });
        }

        const user = await User.findOne({
            email: identifier,
            role: role
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email, password or role"
            });
        }

        const isMatch = await user.comparePassword(password);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email, password or role"
            });
        }

        res.status(200).json({
            success: true,
            message: "Login successful",
            user: {
                id: user._id,
                role: user.role,
                name: user.name,
                email: user.email
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

module.exports = router;