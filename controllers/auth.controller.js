import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";

import crypto from "crypto";
import emailService from "../services/email.service.js";
import AppError from "../utils/AppError.js";

const signUp = async (req, res) => {
  try {
    const { name, phone, email, password } = req.body;

    // Basic validation
    if (!name || !phone || !email || !password) {
      return res.status(400).json({
        message: "Name, phone, email and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters long",
      });
    }

    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({
        message: "Phone number must be 10 digits",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({
        message: "Please enter a valid email address",
      });
    }

    // Check if phone or email already exists
    const existingUser = await pool.query(
      `SELECT id, phone, email
       FROM users
       WHERE phone = $1
          OR LOWER(email) = $2`,
      [phone, normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      const existing = existingUser.rows[0];

      if (existing.phone === phone) {
        return res.status(409).json({
          message: "User already exists with this phone number",
        });
      }

      return res.status(409).json({
        message: "An account already exists with this email address",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user
    const result = await pool.query(
      `INSERT INTO users
       (name, phone, email, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, phone, email, role`,
      [name.trim(), phone, normalizedEmail, hashedPassword]
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
};


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
        email: user.email || null,
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

const forgotPassword1 = async (req, res, next) => {
  try {
    const { email } = req.body;

    // Basic validation
    if (!email) {
      throw new AppError("Email is required", 400);
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      throw new AppError("Please enter a valid email address", 400);
    }

    // Find user by email
    const result = await pool.query(
      `SELECT id, email
       FROM users
       WHERE LOWER(email) = $1`,
      [normalizedEmail]
    );

    /*
     * Do not reveal whether the email exists.
     * This prevents account enumeration.
     */
    if (result.rows.length === 0) {
      return res.status(200).json({
        message:
          "If an account exists with this email, an OTP has been sent.",
      });
    }

    const user = result.rows[0];

    // Generate secure 6-digit OTP
    const otp = crypto
      .randomInt(100000, 1000000)
      .toString();

    // Hash OTP before storing
    const otpHash = await bcrypt.hash(otp, 10);

    // Invalidate previous OTPs
    await pool.query(
      `DELETE FROM password_reset_otps
       WHERE user_id = $1`,
      [user.id]
    );

    // Store new OTP
    await pool.query(
      `INSERT INTO password_reset_otps
       (user_id, otp_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '5 minutes')`,
      [user.id, otpHash]
    );

    // Send OTP
    await emailService.sendPasswordResetOtp(
      user.email,
      otp
    );

    return res.status(200).json({
      message:
        "If an account exists with this email, an OTP has been sent.",
    });

  } catch (error) {
    next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    // --------------------------------------------------
    // 1. Basic validation
    // --------------------------------------------------

    if (!email) {
      throw new AppError("Email is required", 400);
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      throw new AppError("Please enter a valid email address", 400);
    }

    // --------------------------------------------------
    // 2. Find user
    // --------------------------------------------------

    const userResult = await pool.query(
      `SELECT id, email
       FROM users
       WHERE LOWER(email) = $1`,
      [normalizedEmail]
    );

    /*
     * Don't reveal whether the email exists.
     */
    if (userResult.rows.length === 0) {
      return res.status(200).json({
        message:
          "If an account exists with this email, an OTP has been sent.",
      });
    }

    const user = userResult.rows[0];

    // --------------------------------------------------
    // 3. Configuration
    // --------------------------------------------------

    const resendCooldownSeconds =
      Number(process.env.PASSWORD_RESET_OTP_RESEND_SECONDS) || 60;

    const maxRequests =
      Number(process.env.PASSWORD_RESET_MAX_REQUESTS) || 5;

    const rateWindowMinutes =
      Number(process.env.PASSWORD_RESET_RATE_WINDOW_MINUTES) || 15;

    const expiryMinutes =
      Number(process.env.PASSWORD_RESET_OTP_EXPIRY_MINUTES) || 5;

    // --------------------------------------------------
    // 4. Check resend cooldown
    // --------------------------------------------------

    const recentRequestResult = await pool.query(
      `SELECT
         EXTRACT(
           EPOCH FROM (NOW() - created_at)
         ) AS seconds_since_request
       FROM password_reset_requests
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [user.id]
    );

    if (recentRequestResult.rows.length > 0) {
      const secondsSinceRequest = Number(
        recentRequestResult.rows[0].seconds_since_request
      );

      if (secondsSinceRequest < resendCooldownSeconds) {
        const retryAfter = Math.ceil(
          resendCooldownSeconds - secondsSinceRequest
        );

        throw new AppError(
          `Please wait ${retryAfter} seconds before requesting another OTP.`,
          429
        );
      }
    }

    // --------------------------------------------------
    // 5. Check rate limit
    // --------------------------------------------------

    const requestCountResult = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM password_reset_requests
       WHERE user_id = $1
         AND created_at >= NOW() -
             ($2 * INTERVAL '1 minute')`,
      [user.id, rateWindowMinutes]
    );

    const requestCount = requestCountResult.rows[0].count;

    if (requestCount >= maxRequests) {
      throw new AppError(
        "Too many password reset requests. Please try again later.",
        429
      );
    }

    // --------------------------------------------------
    // 6. Generate secure OTP
    // --------------------------------------------------

    const otp = crypto
      .randomInt(100000, 1000000)
      .toString();

    // --------------------------------------------------
    // 7. Hash OTP
    // --------------------------------------------------

    const otpHash = await bcrypt.hash(otp, 10);

    // --------------------------------------------------
    // 8. Invalidate previous OTP
    // --------------------------------------------------

    await pool.query(
      `DELETE FROM password_reset_otps
       WHERE user_id = $1`,
      [user.id]
    );

    // --------------------------------------------------
    // 9. Store new OTP
    // --------------------------------------------------

    await pool.query(
      `INSERT INTO password_reset_otps
       (user_id, otp_hash, expires_at)
       VALUES (
         $1,
         $2,
         NOW() + ($3 * INTERVAL '1 minute')
       )`,
      [user.id, otpHash, expiryMinutes]
    );

    // --------------------------------------------------
    // 10. Record request for rate limiting
    // --------------------------------------------------

    await pool.query(
      `INSERT INTO password_reset_requests
       (user_id)
       VALUES ($1)`,
      [user.id]
    );

    // --------------------------------------------------
    // 11. Send OTP
    // --------------------------------------------------

    await emailService.sendPasswordResetOtp(
      user.email,
      otp
    );

    // --------------------------------------------------
    // 12. Response
    // --------------------------------------------------

    return res.status(200).json({
      message:
        "If an account exists with this email, an OTP has been sent.",
    });

  } catch (error) {
    next(error);
  }
};

const verifyResetOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    // --------------------------------------------------
    // 1. Basic validation
    // --------------------------------------------------

    if (!email || !otp) {
      throw new AppError("Email and OTP are required", 400);
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      throw new AppError("Please enter a valid email address", 400);
    }

    if (!/^\d{6}$/.test(otp)) {
      throw new AppError("OTP must be 6 digits", 400);
    }

    // --------------------------------------------------
    // 2. Find user by email
    // --------------------------------------------------

    const userResult = await pool.query(
      `SELECT id, email
       FROM users
       WHERE LOWER(email) = $1`,
      [normalizedEmail]
    );

    if (userResult.rows.length === 0) {
      throw new AppError("Invalid or expired OTP", 400);
    }

    const userId = userResult.rows[0].id;

    console.log("User ID for OTP verification:", userId);

    // --------------------------------------------------
    // 3. Get latest OTP
    //
    // PostgreSQL calculates whether the OTP is expired.
    // This avoids JavaScript/PostgreSQL timezone problems.
    // --------------------------------------------------

    const otpResult = await pool.query(
      `SELECT
          id,
          user_id,
          otp_hash,
          expires_at,
          attempts,
          verified,
          created_at,
          expires_at <= NOW() AS expired
       FROM password_reset_otps
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId]
    );

    console.log("OTP result:", otpResult.rows);

    if (otpResult.rows.length === 0) {
      throw new AppError("Invalid or expired OTP", 400);
    }

    const resetOtp = otpResult.rows[0];

    // --------------------------------------------------
    // 4. Check if OTP was already verified
    // --------------------------------------------------

    if (resetOtp.verified) {
      throw new AppError(
        "This OTP has already been used. Please request a new OTP.",
        400
      );
    }

    // --------------------------------------------------
    // 5. Check OTP expiration
    //
    // IMPORTANT:
    // resetOtp.expired is calculated by PostgreSQL:
    //
    // expires_at <= NOW()
    // --------------------------------------------------

    if (resetOtp.expired) {
      await pool.query(
        `DELETE FROM password_reset_otps
         WHERE id = $1`,
        [resetOtp.id]
      );

      throw new AppError("OTP has expired", 400);
    }

    // --------------------------------------------------
    // 6. Check maximum attempts
    // --------------------------------------------------

    if (resetOtp.attempts >= 5) {
      await pool.query(
        `DELETE FROM password_reset_otps
         WHERE id = $1`,
        [resetOtp.id]
      );

      throw new AppError(
        "Too many incorrect attempts. Please request a new OTP.",
        429
      );
    }

    // --------------------------------------------------
    // 7. Compare entered OTP with stored hash
    // --------------------------------------------------

    const isValid = await bcrypt.compare(
      otp,
      resetOtp.otp_hash
    );

    // --------------------------------------------------
    // 8. Invalid OTP
    // --------------------------------------------------

    if (!isValid) {
      await pool.query(
        `UPDATE password_reset_otps
         SET attempts = attempts + 1
         WHERE id = $1`,
        [resetOtp.id]
      );

      const remainingAttempts = 4 - resetOtp.attempts;

      if (remainingAttempts <= 0) {
        await pool.query(
          `DELETE FROM password_reset_otps
           WHERE id = $1`,
          [resetOtp.id]
        );

        throw new AppError(
          "Too many incorrect attempts. Please request a new OTP.",
          429
        );
      }

      throw new AppError(
        `Invalid OTP. ${remainingAttempts} attempt${
          remainingAttempts === 1 ? "" : "s"
        } remaining.`,
        400
      );
    }

    // --------------------------------------------------
    // 9. Mark OTP as verified
    // --------------------------------------------------

    await pool.query(
      `UPDATE password_reset_otps
       SET verified = true
       WHERE id = $1`,
      [resetOtp.id]
    );

    // --------------------------------------------------
    // 10. Generate short-lived reset token
    // --------------------------------------------------

    const resetToken = jwt.sign(
      {
        userId: userId,
        purpose: "password-reset",
        otpId: resetOtp.id,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "10m",
      }
    );

    // --------------------------------------------------
    // 11. Success response
    // --------------------------------------------------

    return res.status(200).json({
      message: "OTP verified successfully",
      resetToken,
    });

  } catch (error) {
    next(error);
  }
};


const resetPassword = async (req, res, next) => {
  try {
    const { resetToken, newPassword } = req.body;

    // --------------------------------------------------
    // 1. Basic validation
    // --------------------------------------------------

    if (!resetToken || !newPassword) {
      throw new AppError(
        "Reset token and new password are required",
        400
      );
    }

    if (newPassword.length < 6) {
      throw new AppError(
        "New password must be at least 6 characters long",
        400
      );
    }

    // --------------------------------------------------
    // 2. Verify reset token
    // --------------------------------------------------

    let decoded;

    try {
      decoded = jwt.verify(
        resetToken,
        process.env.JWT_SECRET
      );
    } catch (error) {
      throw new AppError(
        "Invalid or expired reset token",
        400
      );
    }

    // --------------------------------------------------
    // 3. Make sure this is a password-reset token
    // --------------------------------------------------

    if (
      decoded.purpose !== "password-reset" ||
      !decoded.userId ||
      !decoded.otpId
    ) {
      throw new AppError(
        "Invalid reset token",
        400
      );
    }

    // --------------------------------------------------
    // 4. Verify OTP record
    // --------------------------------------------------

    const otpResult = await pool.query(
      `SELECT id, user_id, verified, expires_at
       FROM password_reset_otps
       WHERE id = $1
         AND user_id = $2`,
      [decoded.otpId, decoded.userId]
    );

    if (otpResult.rows.length === 0) {
      throw new AppError(
        "Invalid or expired reset request",
        400
      );
    }

    const resetOtp = otpResult.rows[0];

    // --------------------------------------------------
    // 5. Make sure OTP was actually verified
    // --------------------------------------------------

    if (!resetOtp.verified) {
      throw new AppError(
        "OTP verification is required",
        400
      );
    }

    // --------------------------------------------------
    // 6. Check OTP expiration using PostgreSQL
    // --------------------------------------------------

    const expiryCheck = await pool.query(
      `SELECT expires_at <= NOW() AS expired
       FROM password_reset_otps
       WHERE id = $1`,
      [resetOtp.id]
    );

    if (expiryCheck.rows[0]?.expired) {
      await pool.query(
        `DELETE FROM password_reset_otps
         WHERE id = $1`,
        [resetOtp.id]
      );

      throw new AppError(
        "Password reset request has expired",
        400
      );
    }

    // --------------------------------------------------
    // 7. Hash new password
    // --------------------------------------------------

    const hashedPassword = await bcrypt.hash(
      newPassword,
      10
    );

    // --------------------------------------------------
    // 8. Update password
    // --------------------------------------------------

    const updateResult = await pool.query(
      `UPDATE users
       SET password_hash = $1
       WHERE id = $2
       RETURNING id`,
      [hashedPassword, decoded.userId]
    );

    if (updateResult.rows.length === 0) {
      throw new AppError(
        "User not found",
        404
      );
    }

    // --------------------------------------------------
    // 9. Invalidate OTP
    // --------------------------------------------------

    await pool.query(
      `DELETE FROM password_reset_otps
       WHERE id = $1`,
      [resetOtp.id]
    );

    // --------------------------------------------------
    // 10. Success
    // --------------------------------------------------

    return res.status(200).json({
      message: "Password reset successful",
    });

  } catch (error) {
    next(error);
  }
};

export { signUp, login, resetPassword, forgotPassword, verifyResetOtp };