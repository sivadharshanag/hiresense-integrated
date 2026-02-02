import { Response, NextFunction } from 'express';
import { ApplicantProfile } from '../models/ApplicantProfile.model';
import { User } from '../models/User.model';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth.middleware';
import resumeParserService from '../services/resume-parser.service';

export const getProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    let profile = await ApplicantProfile.findOne({ userId: req.user?.id });

    // If no profile exists, return an empty profile structure
    if (!profile) {
      res.status(200).json({
        status: 'success',
        data: { 
          profile: {
            skills: [],
            preferredRoles: [],
            experience: [],
            education: [],
            githubUsername: '',
            resumeUrl: '',
            resumeFileName: '',
            yearsOfExperience: 0,
            bio: '',
            location: '',
            linkedinUrl: '',
            profileComplete: false
          }
        }
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: { profile }
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { skills, experience, education, githubUsername, leetcodeUsername, experienceText, educationText, preferredRoles, resumeUrl, resumeFileName, yearsOfExperience, bio, location, linkedinUrl, portfolioUrl, projects, certifications } = req.body;

    // Check if profile exists
    let profile = await ApplicantProfile.findOne({ userId: req.user?.id });

    const updateData: any = {};
    if (skills) updateData.skills = skills;
    if (preferredRoles) updateData.preferredRoles = preferredRoles;
    if (experience) updateData.experience = experience;
    if (education) updateData.education = education;
    if (githubUsername !== undefined) updateData.githubUsername = githubUsername;
    // Also store text versions for simpler display
    if (experienceText !== undefined) updateData.experienceText = experienceText;
    if (educationText !== undefined) updateData.educationText = educationText;
    // Resume data (base64)
    if (resumeUrl !== undefined) updateData.resumeUrl = resumeUrl;
    if (resumeFileName !== undefined) updateData.resumeFileName = resumeFileName;
    // New fields
    if (yearsOfExperience !== undefined) updateData.yearsOfExperience = yearsOfExperience;
    if (bio !== undefined) updateData.bio = bio;
    if (location !== undefined) updateData.location = location;
    if (linkedinUrl !== undefined) updateData.linkedinUrl = linkedinUrl;
    if (portfolioUrl !== undefined) updateData.portfolioUrl = portfolioUrl;
    // LeetCode
    if (leetcodeUsername !== undefined) updateData.leetcodeUsername = leetcodeUsername;
    // Projects
    if (projects !== undefined) updateData.projects = projects;
    // Certifications
    if (certifications !== undefined) updateData.certifications = certifications;

    if (!profile) {
      // Create new profile
      profile = await ApplicantProfile.create({
        userId: req.user?.id,
        ...updateData
      });
    } else {
      // Update existing profile
      profile = await ApplicantProfile.findOneAndUpdate(
        { userId: req.user?.id },
        updateData,
        { new: true, runValidators: true }
      );
    }

    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      data: { profile }
    });
  } catch (error) {
    next(error);
  }
};

export const uploadResume = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // TODO: Implement resume upload with Multer + Cloudinary
    // This will be implemented in Phase 5
    res.status(501).json({
      status: 'error',
      message: 'Resume upload endpoint - to be implemented in Phase 5'
    });
  } catch (error) {
    next(error);
  }
};

export const analyzeLeetCode = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { username } = req.body;

    if (!username) {
      throw new AppError('LeetCode username is required', 400);
    }

    // Import dynamically to avoid circular deps
    const { leetCodeService } = await import('../services/leetcode.service');
    
    const result = await leetCodeService.fetchLeetCodeStats(username);

    if ('error' in result) {
      throw new AppError(result.error, 400);
    }

    // Save to profile
    await ApplicantProfile.findOneAndUpdate(
      { userId: req.user?.id },
      {
        leetcodeUsername: result.username,
        leetcodeStats: {
          totalSolved: result.totalSolved,
          easySolved: result.easySolved,
          mediumSolved: result.mediumSolved,
          hardSolved: result.hardSolved,
          ranking: result.ranking,
          score: result.score,
          lastAnalyzed: new Date()
        }
      },
      { upsert: true }
    );

    const insights = leetCodeService.getLeetCodeInsights(result);

    res.status(200).json({
      status: 'success',
      message: 'LeetCode profile analyzed successfully',
      data: {
        ...result,
        insights
      }
    });
  } catch (error) {
    next(error);
  }
};

export const parseResume = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      throw new AppError('No file uploaded', 400);
    }

    const { buffer, mimetype } = req.file;

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];

    if (!allowedTypes.includes(mimetype)) {
      throw new AppError('Invalid file type. Please upload PDF or DOCX', 400);
    }

    // Parse resume
    const parsedData = await resumeParserService.parseResume(buffer, mimetype);

    res.status(200).json({
      status: 'success',
      message: 'Resume parsed successfully',
      data: parsedData
    });
  } catch (error) {
    next(error);
  }
};

export const uploadAvatar = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw new AppError('No image file uploaded', 400);
    }

    const { buffer, mimetype } = req.file;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(mimetype)) {
      throw new AppError('Invalid file type. Please upload JPG, PNG, GIF, or WebP', 400);
    }

    // Convert to base64 data URL for storage
    const base64 = buffer.toString('base64');
    const avatarUrl = `data:${mimetype};base64,${base64}`;

    // Update user's avatar
    await User.findByIdAndUpdate(req.user?.id, { avatarUrl });

    res.status(200).json({
      status: 'success',
      message: 'Avatar uploaded successfully',
      data: { avatarUrl }
    });
  } catch (error) {
    next(error);
  }
};
