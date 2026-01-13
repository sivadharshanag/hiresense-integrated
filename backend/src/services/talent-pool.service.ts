import { TalentPool, ITalentPool } from '../models/TalentPool.model';
import { Job, IJob } from '../models/Job.model';
import { ApplicantProfile } from '../models/ApplicantProfile.model';
import { Application } from '../models/Application.model';
import { skillNormalizerService } from './skill-normalizer.service';
import mongoose from 'mongoose';

interface SmartTag {
  tag: string;
  confidence: number;
  category: 'skills' | 'leadership' | 'potential' | 'experience' | 'culture';
}

interface SuggestedJob {
  jobId: mongoose.Types.ObjectId;
  jobTitle: string;
  matchScore: number;
  matchedSkills: string[];
}

interface TalentPoolResult {
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  smartTags: SmartTag[];
  suggestedJobs: SuggestedJob[];
  addedToPool: boolean;
}

class TalentPoolService {
  /**
   * Minimum match score to suggest a job (65%)
   */
  private MIN_MATCH_THRESHOLD = 65;

  /**
   * Generate smart tags for a candidate based on their profile
   */
  generateSmartTags(profile: any, originalJob: IJob): SmartTag[] {
    const tags: SmartTag[] = [];

    // Skills-based tags
    const topSkills = profile.skills?.slice(0, 5) || [];
    topSkills.forEach((skill: string) => {
      if (skill.toLowerCase().includes('react') || skill.toLowerCase().includes('vue') || skill.toLowerCase().includes('angular')) {
        tags.push({ tag: 'Strong Frontend', confidence: 85, category: 'skills' });
      }
      if (skill.toLowerCase().includes('node') || skill.toLowerCase().includes('python') || skill.toLowerCase().includes('java')) {
        tags.push({ tag: 'Backend Developer', confidence: 85, category: 'skills' });
      }
      if (skill.toLowerCase().includes('aws') || skill.toLowerCase().includes('azure') || skill.toLowerCase().includes('gcp')) {
        tags.push({ tag: 'Cloud Experience', confidence: 80, category: 'skills' });
      }
      if (skill.toLowerCase().includes('docker') || skill.toLowerCase().includes('kubernetes')) {
        tags.push({ tag: 'DevOps Ready', confidence: 80, category: 'skills' });
      }
      if (skill.toLowerCase().includes('ml') || skill.toLowerCase().includes('machine learning') || skill.toLowerCase().includes('ai')) {
        tags.push({ tag: 'AI/ML Expertise', confidence: 85, category: 'skills' });
      }
    });

    // Experience-based tags
    const yearsExp = profile.yearsOfExperience || profile.experience?.length || 0;
    if (yearsExp >= 8) {
      tags.push({ tag: 'Senior Professional', confidence: 90, category: 'experience' });
    } else if (yearsExp >= 5) {
      tags.push({ tag: 'Mid-Level Expert', confidence: 85, category: 'experience' });
    } else if (yearsExp >= 2) {
      tags.push({ tag: 'Growing Professional', confidence: 80, category: 'experience' });
    } else {
      tags.push({ tag: 'Fresh Talent', confidence: 75, category: 'potential' });
    }

    // Leadership potential based on roles
    const hasLeadershipRoles = profile.experience?.some((exp: any) => {
      const role = exp.role?.toLowerCase() || '';
      return role.includes('lead') || role.includes('manager') || role.includes('head') || role.includes('director');
    });
    if (hasLeadershipRoles) {
      tags.push({ tag: 'Leadership Potential', confidence: 85, category: 'leadership' });
    }

    // GitHub activity
    if (profile.githubAnalysis?.score >= 70) {
      tags.push({ tag: 'Active Open Source', confidence: 80, category: 'potential' });
    }

    // Projects-based tags
    if (profile.projects?.length >= 3) {
      tags.push({ tag: 'Project Portfolio', confidence: 75, category: 'potential' });
    }

    // Certifications
    if (profile.certifications?.length > 0) {
      tags.push({ tag: 'Certified Professional', confidence: 80, category: 'skills' });
    }

    // Remove duplicates and return top 5 unique tags
    const uniqueTags = tags.reduce((acc: SmartTag[], curr) => {
      if (!acc.find(t => t.tag === curr.tag)) {
        acc.push(curr);
      }
      return acc;
    }, []);

    return uniqueTags.slice(0, 5);
  }

  /**
   * Calculate skill match percentage between candidate and job
   * Uses NLP-based skill normalization for accurate matching
   * (e.g., "Node" matches "NodeJS", "node.js", "node js")
   */
  calculateSkillMatch(candidateSkills: string[], jobSkills: string[]): { score: number; matchedSkills: string[] } {
    if (!jobSkills.length || !candidateSkills.length) {
      return { score: 0, matchedSkills: [] };
    }

    // Use NLP-based skill normalizer for accurate matching
    const result = skillNormalizerService.calculateSkillMatch(jobSkills, candidateSkills);
    return { score: result.score, matchedSkills: result.matchedSkills };
  }

  /**
   * Find other jobs that match this candidate's skills
   */
  async findMatchingJobs(
    candidateProfile: any,
    recruiterId: mongoose.Types.ObjectId,
    excludeJobId: mongoose.Types.ObjectId
  ): Promise<SuggestedJob[]> {
    // Get all active jobs from this recruiter (excluding the rejected job)
    const activeJobs = await Job.find({
      recruiterId,
      status: 'active',
      _id: { $ne: excludeJobId }
    });

    const suggestedJobs: SuggestedJob[] = [];
    const candidateSkills = candidateProfile.skills || [];

    for (const job of activeJobs) {
      const { score, matchedSkills } = this.calculateSkillMatch(
        candidateSkills,
        job.requiredSkills || []
      );

      if (score >= this.MIN_MATCH_THRESHOLD) {
        suggestedJobs.push({
          jobId: job._id as mongoose.Types.ObjectId,
          jobTitle: job.title,
          matchScore: score,
          matchedSkills
        });
      }
    }

    // Sort by match score descending
    return suggestedJobs.sort((a, b) => b.matchScore - a.matchScore).slice(0, 3);
  }

  /**
   * Auto-add candidate to talent pool on rejection
   */
  async addToTalentPoolOnRejection(
    applicationId: mongoose.Types.ObjectId,
    recruiterId: mongoose.Types.ObjectId
  ): Promise<TalentPoolResult | null> {
    try {
      const application = await Application.findById(applicationId)
        .populate('applicantId', 'fullName email')
        .populate('jobId');

      if (!application) {
        console.log('Application not found for talent pool');
        return null;
      }

      const applicant = application.applicantId as any;
      const job = application.jobId as any;

      // Get candidate profile
      const profile = await ApplicantProfile.findOne({ userId: applicant._id });
      if (!profile) {
        console.log('No profile found for candidate');
        return null;
      }

      // Check if already in talent pool
      const existing = await TalentPool.findOne({
        applicantId: applicant._id,
        recruiterId
      });

      if (existing) {
        console.log('Candidate already in talent pool');
        return null;
      }

      // Generate smart tags
      const smartTags = this.generateSmartTags(profile, job);

      // Find matching jobs
      const suggestedJobs = await this.findMatchingJobs(
        profile,
        recruiterId,
        job._id
      );

      // Only add to pool if there are matching jobs or good tags
      if (suggestedJobs.length === 0 && smartTags.length < 2) {
        console.log('Candidate does not meet talent pool criteria');
        return {
          candidateId: applicant._id.toString(),
          candidateName: applicant.fullName,
          candidateEmail: applicant.email,
          smartTags,
          suggestedJobs,
          addedToPool: false
        };
      }

      // Create talent pool entry
      await TalentPool.create({
        recruiterId,
        applicantId: applicant._id,
        originalJobId: job._id,
        originalApplicationId: applicationId,
        smartTags,
        suggestedJobs: suggestedJobs.map(sj => ({
          jobId: sj.jobId,
          matchScore: sj.matchScore,
          matchedSkills: sj.matchedSkills,
          suggestedAt: new Date()
        })),
        status: 'active'
      });

      console.log(`✅ Added ${applicant.fullName} to talent pool with ${suggestedJobs.length} suggested jobs`);

      return {
        candidateId: applicant._id.toString(),
        candidateName: applicant.fullName,
        candidateEmail: applicant.email,
        smartTags,
        suggestedJobs,
        addedToPool: true
      };
    } catch (error) {
      console.error('Error adding to talent pool:', error);
      return null;
    }
  }

  /**
   * Get all talent pool entries for a recruiter
   */
  async getTalentPool(recruiterId: mongoose.Types.ObjectId, status?: string) {
    const query: any = { recruiterId };
    if (status) {
      query.status = status;
    }

    const entries = await TalentPool.find(query)
      .populate('applicantId', 'fullName email')
      .populate('originalJobId', 'title')
      .populate('suggestedJobs.jobId', 'title status')
      .sort({ addedAt: -1 });

    return entries;
  }

  /**
   * Update talent pool entry status
   */
  async updateTalentPoolStatus(
    entryId: mongoose.Types.ObjectId,
    status: 'active' | 'contacted' | 'hired' | 'archived',
    notes?: string
  ) {
    const update: any = { status };
    if (notes) {
      update.notes = notes;
    }

    const entry = await TalentPool.findByIdAndUpdate(
      entryId,
      update,
      { new: true }
    );

    return entry;
  }

  /**
   * Remove from talent pool
   */
  async removeFromTalentPool(entryId: mongoose.Types.ObjectId) {
    await TalentPool.findByIdAndDelete(entryId);
  }
}

export const talentPoolService = new TalentPoolService();
export default talentPoolService;
