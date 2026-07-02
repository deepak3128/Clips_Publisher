import bcrypt from 'bcryptjs';
import { getDatabase } from '../utils/database';
import { generateToken } from '../utils/jwt';
import { AppError } from '../middleware/error';
import type { User, JWTPayload } from '../types';

const SALT_ROUNDS = 10;

export async function registerUser(email: string, name: string, password: string): Promise<{ user: User; token: string }> {
  const db = getDatabase();

  // Check if user exists
  const existingUser = await db('users').where({ email }).first();
  if (existingUser) {
    throw new AppError('User already exists', 409);
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  // Create user
  const [user] = await db('users')
    .insert({
      email,
      name,
      password: hashedPassword,
    })
    .returning('*');

  // Generate token
  const token = generateToken({
    id: user.id,
    email: user.email,
  });

  return { user, token };
}

export async function loginUser(email: string, password: string): Promise<{ user: User; token: string }> {
  const db = getDatabase();

  const user = await db('users').where({ email }).first();
  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    throw new AppError('Invalid credentials', 401);
  }

  const token = generateToken({
    id: user.id,
    email: user.email,
  });

  return { user, token };
}

export async function getUserById(id: string): Promise<User> {
  const db = getDatabase();
  const user = await db('users').where({ id }).first();
  if (!user) {
    throw new AppError('User not found', 404);
  }
  return user;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const db = getDatabase();
  return db('users').where({ email }).first() || null;
}

export async function createOrUpdateGoogleUser(email: string, name: string, googleId: string): Promise<{ user: User; token: string }> {
  const db = getDatabase();

  let user = await db('users').where({ google_id: googleId }).first();

  if (!user) {
    // Create new user
    [user] = await db('users')
      .insert({
        email,
        name,
        google_id: googleId,
      })
      .returning('*');
  }

  const token = generateToken({
    id: user.id,
    email: user.email,
  });

  return { user, token };
}

export async function createOrUpdateMetaUser(email: string, name: string, metaId: string): Promise<{ user: User; token: string }> {
  const db = getDatabase();

  let user = await db('users').where({ meta_id: metaId }).first();

  if (!user) {
    // Create new user
    [user] = await db('users')
      .insert({
        email,
        name,
        meta_id: metaId,
      })
      .returning('*');
  }

  const token = generateToken({
    id: user.id,
    email: user.email,
  });

  return { user, token };
}
