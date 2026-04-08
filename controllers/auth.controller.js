import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";

const signUp = async(req, res) => {
  try {
    const { name, phone, password } = req.body;

    //  Basic validation
    if (!name || !phone || !password) {
      return res.status(400).json({
        message: "Name, phone and password are required",
      });
    }

    if(password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters long",
      });
    }
    
    if(!/^\d{10}$/.test(phone)) {
      return res.status(400).json({
        message: "Phone number must be 10 digits",
      });
    }

    //  Check if user already exists
    const existingUser = await pool.query(
      "SELECT id FROM users WHERE phone = $1",
      [phone]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        message: "User already exists with this phone number",
      });
    }

    //  Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    //  Insert new user
    const result = await pool.query(
      `INSERT INTO users (name, phone, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, phone`,
      [name, phone, hashedPassword]
    );

    res.status(201).json({
      message: "Signup successful",
      user: result.rows[0],
    });

  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
}

const login = async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({
        message: "Phone and password are required",
      });
    }

    //  Find user
    const result = await pool.query(
      "SELECT * FROM users WHERE phone = $1",
      [phone]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    const user = result.rows[0];

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role || "customer",
      },
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { phone, newPassword } = req.body;
    
    if (!phone || !newPassword) {
      return res.status(400).json({
        message: "Phone and new password are required",
      });
    }

    if(newPassword.length < 6) {
      return res.status(400).json({
        message: "New password must be at least 6 characters long",
      });
    }

    //  Find user
    const result = await pool.query(
      "SELECT id FROM users WHERE phone = $1",
      [phone]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    //  Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    //  Update password
    await pool.query(
      "UPDATE users SET password_hash = $1 WHERE phone = $2",
      [hashedPassword, phone]
    );

    res.status(200).json({
      message: "Password reset successful",
    });

  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export { signUp, login, resetPassword };