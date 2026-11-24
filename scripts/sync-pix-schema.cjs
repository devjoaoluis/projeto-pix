require('dotenv').config({ quiet: true });
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { Pool } = require('pg');

async function main() {
  if (!process.env.DB_URL) throw new Error('Configure DB_URL no .env.');
  const pool = new Pool({ connectionString: process.env.DB_URL });
  const connection = await pool.connect();
  try {
    await connection.query('BEGIN');
    await connection.query("SET LOCAL lock_timeout = '5s'");
    await connection.query(
      readFileSync(join(__dirname, 'sync-pix-schema.sql'), 'utf8'),
    );
    await connection.query('COMMIT');
    console.log(
      'Estruturas ausentes do Pix adicionadas. Registros existentes preservados.',
    );
  } catch (error) {
    await connection.query('ROLLBACK');
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
