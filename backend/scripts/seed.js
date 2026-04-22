/**
 * seed.js — creates an admin user and a test user in MongoDB.
 * Safe to run multiple times: uses upsert so existing users are not duplicated.
 * Usage: node scripts/seed.js
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../src/models/user.js';

const SALT_ROUNDS = 12;

const SEED_USERS = [
  {
    name: 'SixAlert Admin',
    email: 'admin@sixalert.com',
    password: 'Admin@123456',
    role: 'admin',
  },
  {
    name: 'Test User',
    email: 'user@sixalert.com',
    password: 'User@123456',
    role: 'user',
  },
];

const seed = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not set in .env');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  for (const u of SEED_USERS) {
    const passwordHash = await bcrypt.hash(u.password, SALT_ROUNDS);

    await User.findOneAndUpdate(
      { email: u.email },
      { name: u.name, email: u.email, passwordHash, role: u.role },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log(`✓ ${u.role.padEnd(5)} — ${u.email}  (password: ${u.password})`);
  }

  await mongoose.disconnect();
  console.log('\nSeed complete. Use these credentials to log in via POST /auth/login');
};

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
