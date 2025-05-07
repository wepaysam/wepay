import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

export const hashPassword = async (password) => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

export const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

export const generateToken = (user) => {
  console.log('Generating token for user:', user.id, user.userType);
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      userType: user.userType 
    }, 
    JWT_SECRET, 
    { expiresIn: '24h' }
  );
};

export const verifyToken = (token) => {
  try {
    if (!token) {
      console.error('Token is undefined or null');
      throw new Error('Token is required');
    }
    
    console.log('Verifying token of length:', token.length);
    
    // Try to use the provided secret first
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      console.log('Token verified successfully for user:', decoded.id);
      return decoded;
    } catch (primaryError) {
      console.error('Primary JWT verification failed:', primaryError.message);
      throw primaryError;
    }
  } catch (error) {
    console.error('Token verification failed:', error.message);
    throw new Error('Invalid token');
  }
};
