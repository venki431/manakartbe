import pool from "../config/db.js";

const userService = {

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
        const { house, street, area, pincode, landmark, is_default = false } = data;

        if (!house || !street || !area || !pincode) {
            throw new Error("All required address fields must be filled");
        }

        if (is_default) {
            await pool.query(
                "UPDATE addresses SET is_default = false WHERE user_id = $1",
                [userId]
            );
        }

        const result = await pool.query(
            `INSERT INTO addresses
             (user_id, house, street, area, pincode, landmark, is_default)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [userId, house, street, area, pincode, landmark || null, is_default]
        );

        return result.rows[0];
    },

    /* ---------------- UPDATE ADDRESS ---------------- */
    async updateAddress(userId, addressId, data) {
        const { house, street, area, pincode, landmark, is_default } = data;

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

        const result = await pool.query(
            `UPDATE addresses
             SET house=$1, street=$2, area=$3, pincode=$4,
                 landmark=$5, is_default=$6
             WHERE id=$7
             RETURNING *`,
            [house, street, area, pincode, landmark || null, is_default || false, addressId]
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