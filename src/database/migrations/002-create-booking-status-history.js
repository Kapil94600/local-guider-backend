// src/database/migrations/002-create-booking-status-history.js
export default {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS booking_status_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_id UUID NOT NULL,
        changed_by_id UUID,
        changed_by_role VARCHAR(20) NOT NULL DEFAULT 'SYSTEM',
        from_status VARCHAR(20),
        to_status VARCHAR(20) NOT NULL,
        note TEXT,
        metadata JSONB DEFAULT '{}'::jsonb,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT fk_booking_status_history_booking
          FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
      );
    `);

    await queryInterface.sequelize.query(
      `CREATE INDEX IF NOT EXISTS idx_bsh_booking_id ON booking_status_history(booking_id);`
    );
    await queryInterface.sequelize.query(
      `CREATE INDEX IF NOT EXISTS idx_bsh_created_at ON booking_status_history("createdAt");`
    );
    await queryInterface.sequelize.query(
      `CREATE INDEX IF NOT EXISTS idx_bsh_to_status ON booking_status_history(to_status);`
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `DROP TABLE IF EXISTS booking_status_history;`
    );
  },
};