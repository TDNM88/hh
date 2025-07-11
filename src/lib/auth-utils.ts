import { NextRequest } from 'next/server';
import { getMongoDb } from './db';
import { verify } from 'jsonwebtoken';
import { User } from '@/types/auth';
import { ObjectId } from 'mongodb';

/**
 * Verifies the JWT token from the request cookies
 * @param req The Next.js request object
 * @returns The decoded token payload or null if invalid
 */
export async function verifyToken(req: NextRequest): Promise<User | null> {
  try {
    // Get the token from cookies
    const token = req.cookies.get('token')?.value;
    
    if (!token) {
      return null;
    }

    // Verify the token
    const decoded = verify(token, process.env.NEXTAUTH_SECRET || '') as User;
    
    // Get the user from the database
    const db = await getMongoDb();
    if (!db) {
      throw new Error('Không thể kết nối cơ sở dữ liệu');
    }
    
    const user = await db.collection('users').findOne({ _id: new ObjectId(decoded._id) });
    
    if (!user) {
      return null;
    }
    
    // Return the user object with necessary fields
    return {
      _id: user._id.toString(),
      email: user.email,
      name: user.name || user.username || '',
      username: user.username,
      role: user.role || 'user',
      balance: user.balance || { available: 0, frozen: 0 },
      ...(user.bank && { bank: user.bank }),
      ...(user.verification && { verification: user.verification }),
      ...(user.status && { status: user.status }),
    };
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}
