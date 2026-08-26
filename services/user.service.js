import pool from "../config/db.js";

const userService = {

    /* ---------------- ADMIN: LIST ALL USERS ---------------- */
    async getAllUsers() {
        const result = await pool.query(
            `SELECT u.id, u.name, u.phone, u.role, u.created_at,
                    COUNT(o.id)::int                     AS order_count,
                    COALESCE(SUM(o.grand_total), 0)::int AS total_spent,
                    MAX(o.created_at)                    AS last_order_at
             FROM users u
             LEFT JOIN orders o ON o.user_id = u.id
             GROUP BY u.id
             ORDER BY u.created_at DESC`
        );
        return result.rows;
    },

    /* ---------------- GET PROFILE ---------------- */
    async getMyProfile(userId) {
        const result = await pool.query(
            "SELECT id, name, phone, role, created_at FROM users WHERE id = $1",
            [userId]
        );

        if (result.rows.length === 0) {
            throw new Error("User not found");
        }

        return result.rows[0];
    },

    /* ---------------- GET ADDRESSES ---------------- */
    async getMyAddresses(userId) {
        const result = await pool.query(
            "SELECT * FROM addresses WHERE user_id = $1 ORDER BY created_at DESC",
            [userId]
        );

        return result.rows;
    },

    /* ---------------- CREATE ADDRESS ---------------- */
    async createAddress(userId, data) {
        const { house, street, area, pincode, landmark, is_default = false, latitude, longitude } = data;

        if (!house || !street || !area || !pincode || !landmark) {
            throw new Error("All address fields are required");
        }
        
        if (!/^\d{6}$/.test(pincode)) {
            throw new Error("Pincode must be exactly 6 digits");
        }
        
        if (latitude == null || longitude == null) {
            throw new Error("Location coordinates are required");
        }

        if (is_default) {
            await pool.query(
                "UPDATE addresses SET is_default = false WHERE user_id = $1",
                [userId]
            );
        }

        const result = await pool.query(
            `INSERT INTO addresses
             (user_id, house, street, area, pincode, landmark, is_default, latitude, longitude)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING *`,
            [userId, house, street, area, pincode, landmark || null, is_default,
             latitude ?? null, longitude ?? null]
        );

        return result.rows[0];
    },

    /* ---------------- UPDATE ADDRESS ---------------- */
    async updateAddress(userId, addressId, data) {
        const { house, street, area, pincode, landmark, is_default, latitude, longitude } = data;

        if (!house || !street || !area || !pincode || !landmark) {
            throw new Error("All address fields are required");
        }
        
        if (!/^\d{6}$/.test(pincode)) {
            throw new Error("Pincode must be exactly 6 digits");
        }
        
        if (latitude == null || longitude == null) {
            throw new Error("Location coordinates are required");
        }

        const existing = await pool.query(
            "SELECT * FROM addresses WHERE id = $1 AND user_id = $2",
            [addressId, userId]
        );

        if (existing.rows.length === 0) {
            throw new Error("Address not found");
        }

        if (is_default) {
            await pool.query(
                "UPDATE addresses SET is_default = false WHERE user_id = $1",
                [userId]
            );
        }

        // Keep any previously-captured location if the update doesn't include one.
        const newLat = latitude ?? existing.rows[0].latitude;
        const newLng = longitude ?? existing.rows[0].longitude;

        const result = await pool.query(
            `UPDATE addresses
             SET house=$1, street=$2, area=$3, pincode=$4,
                 landmark=$5, is_default=$6, latitude=$7, longitude=$8
             WHERE id=$9
             RETURNING *`,
            [house, street, area, pincode, landmark || null, is_default || false,
             newLat, newLng, addressId]
        );

        return result.rows[0];
    },

    /* ---------------- DELETE ADDRESS ---------------- */
    async deleteAddress(userId, addressId) {
        const existing = await pool.query(
            "SELECT * FROM addresses WHERE id = $1 AND user_id = $2",
            [addressId, userId]
        );

        if (existing.rows.length === 0) {
            throw new Error("Address not found");
        }

        const isDefault = existing.rows[0].is_default;

        await pool.query(
            "DELETE FROM addresses WHERE id = $1",
            [addressId]
        );

        if (isDefault) {
            const another = await pool.query(
                "SELECT id FROM addresses WHERE user_id = $1 LIMIT 1",
                [userId]
            );

            if (another.rows.length > 0) {
                await pool.query(
                    "UPDATE addresses SET is_default = true WHERE id = $1",
                    [another.rows[0].id]
                );
            }
        }

        return true;
    }
};

export default userService;