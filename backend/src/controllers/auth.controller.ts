import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.model';
import { RecruiterProfile } from '../models/RecruiterProfile.model';
import { ApplicantProfile } from '../models/ApplicantProfile.model';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth.middleware';

const generateToken = (userId: string, role: string): string => {
  const secret = process.env.JWT_SECRET || 'fallback_secret';
  
  return jwt.sign(
    { id: userId, role },
    secret,
    { expiresIn: '7d' } as any
  );
};

export const signup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, fullName, role } = req.body;

    // Validate required fields
    if (!email || !password || !fullName || !role) {
      throw new AppError('All fields are required', 400);
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError('Email already registered', 409);
    }

    // Create user
    const user = await User.create({
      email,
      password,
      fullName,
      role
    });

    // Create corresponding profile
    if (role === 'recruiter') {
      await RecruiterProfile.create({ userId: user._id });
    } else {
      await ApplicantProfile.create({ userId: user._id });
    }

    // Generate token
    const token = generateToken(user._id.toString(), user.role);

    res.status(201).json({
      status: 'success',
      message: 'User created successfully',
      data: {
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          role: user.role
        },
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

export const signin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      throw new AppError('Email and password are required', 400);
    }

    // Find user and include password field
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 401);
    }

    // Generate token
    const token = generateToken(user._id.toString(), user.role);

    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          role: user.role
        },
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.user?.id);
    
    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          avatarUrl: user.avatarUrl
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Google OAuth callback handler
export const googleCallback = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    
    if (!user) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:8080'}/auth/signin?error=oauth_failed`);
    }

    // Generate JWT token - user.id is already a string from passport strategy
    const userId = user._id?.toString() || user.id;
    const token = generateToken(userId, user.role);

    // Redirect to frontend with token
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
    res.redirect(`${frontendUrl}/auth/callback?token=${token}&role=${user.role}`);
  } catch (error) {
    next(error);
  }
};
