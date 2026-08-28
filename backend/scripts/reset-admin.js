import 'dotenv/config';
import bcrypt from 'bcryptjs';
import pg from 'pg';

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL || 'postgresql://RICHOBUKU@localhost:5432/smartvet_callcenter';

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function resetOrSeedUser(client, { name, email, password, role = 'agent', isAdmin = false }) {
  const normEmail = email.toLowerCase().trim();
  const hash = await bcrypt.hash(password, 12);
  const isAdm = isAdmin || role === 'admin' || role === 'super_admin';

  const res = await client.query(
    `INSERT INTO agents (name, email, password_hash, role, is_admin, is_active, is_verified, failed_logins, locked_until, status)
     VALUES ($1, $2, $3, $4, $5, true, true, 0, NULL, 'offline')
     ON CONFLICT (email) DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       role = EXCLUDED.role,
       is_admin = EXCLUDED.is_admin,
       is_active = true,
       is_verified = true,
       failed_logins = 0,
       locked_until = NULL,
       updated_at = NOW()
     RETURNING id, name, email, role, is_admin`,
    [name, normEmail, hash, role, isAdm]
  );

  return res.rows[0];
}

async function main() {
  const args = process.argv.slice(2);
  const client = await pool.connect();

  try {
    console.log(`Connecting to database at ${databaseUrl.replace(/:[^:@]+@/, ':****@')}...`);

    if (args.length >= 2) {
      const email = args[0];
      const password = args[1];
      const role = args[2] || 'admin';
      const name = args[3] || email.split('@')[0];
      const isAdmin = role === 'admin' || role === 'super_admin';

      const user = await resetOrSeedUser(client, { name, email, password, role, isAdmin });
      console.log('\n✅ User successfully created/reset:');
      console.log(`   Email:    ${user.email}`);
      console.log(`   Role:     ${user.role}`);
      console.log(`   Is Admin: ${user.is_admin}`);
      console.log(`   Password: ${password}`);
    } else {
      console.log('\n🔄 Seeding/Resetting default development accounts...\n');

      const defaultUsers = [
        {
          name: 'Super Admin',
          email: 'richobuku@gmail.com',
          password: 'Admin123!',
          role: 'admin',
          isAdmin: true,
        },
        {
          name: 'System Admin',
          email: 'admin@smartvet.africa',
          password: 'Admin123!',
          role: 'admin',
          isAdmin: true,
        },
        {
          name: 'Vet Board Reviewer',
          email: 'vetboard@smartvet.africa',
          password: 'VetBoard123!',
          role: 'vet_board',
          isAdmin: false,
        },
        {
          name: 'Call Centre Agent',
          email: 'agent@smartvet.africa',
          password: 'Agent123!',
          role: 'agent',
          isAdmin: false,
        },
      ];

      for (const u of defaultUsers) {
        const user = await resetOrSeedUser(client, u);
        console.log(`✅ [${user.role.toUpperCase()}] ${user.email} -> password: "${u.password}"`);
      }

      console.log('\n✨ All default accounts have been reset/seeded and unlocked.');
    }
  } catch (err) {
    console.error('\n❌ Reset failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
