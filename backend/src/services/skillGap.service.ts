import { skillNormalizerService } from './skill-normalizer.service';

interface SkillGapData {
  skill: string;
  required: boolean;
  candidateLevel: number; // 0-100
  matchStatus: 'strong' | 'moderate' | 'weak' | 'missing';
  gap: number; // Percentage gap
}

interface SkillGapAnalysis {
  overallMatch: number;
  strongSkills: SkillGapData[];
  moderateSkills: SkillGapData[];
  weakSkills: SkillGapData[];
  missingSkills: SkillGapData[];
  summary: string;
}

class SkillGapService {
  /**
   * Analyze skill gaps between job requirements and candidate profile
   */
  analyzeSkillGaps(
    requiredSkills: string[],
    candidateSkills: string[],
    aiInsights?: any
  ): SkillGapAnalysis {
    const skillsData: SkillGapData[] = [];
    
    // Analyze each required skill
    requiredSkills.forEach(requiredSkill => {
      const skillData = this.analyzeIndividualSkill(
        requiredSkill,
        candidateSkills,
        true
      );
      skillsData.push(skillData);
    });

    // Add candidate skills that aren't in requirements (bonus skills)
    candidateSkills.forEach(candidateSkill => {
      const alreadyAnalyzed = skillsData.some(
        s => s.skill.toLowerCase() === candidateSkill.toLowerCase()
      );
      if (!alreadyAnalyzed) {
        const skillData = this.analyzeIndividualSkill(
          candidateSkill,
          candidateSkills,
          false
        );
        skillsData.push(skillData);
      }
    });

    // Categorize skills
    const strongSkills = skillsData.filter(s => s.matchStatus === 'strong');
    const moderateSkills = skillsData.filter(s => s.matchStatus === 'moderate');
    const weakSkills = skillsData.filter(s => s.matchStatus === 'weak');
    const missingSkills = skillsData.filter(s => s.matchStatus === 'missing');

    // Calculate overall match
    const requiredSkillsData = skillsData.filter(s => s.required);
    const overallMatch = requiredSkillsData.length > 0
      ? Math.round(
          requiredSkillsData.reduce((sum, s) => sum + s.candidateLevel, 0) /
          requiredSkillsData.length
        )
      : 0;

    const summary = this.generateSummary(
      requiredSkills.length,
      strongSkills.filter(s => s.required).length,
      moderateSkills.filter(s => s.required).length,
      weakSkills.filter(s => s.required).length,
      missingSkills.filter(s => s.required).length,
      overallMatch
    );

    return {
      overallMatch,
      strongSkills: strongSkills.sort((a, b) => b.candidateLevel - a.candidateLevel),
      moderateSkills: moderateSkills.sort((a, b) => b.candidateLevel - a.candidateLevel),
      weakSkills: weakSkills.sort((a, b) => b.candidateLevel - a.candidateLevel),
      missingSkills,
      summary,
    };
  }

  /**
   * Analyze individual skill match
   */
  private analyzeIndividualSkill(
    skill: string,
    candidateSkills: string[],
    isRequired: boolean
  ): SkillGapData {
    // Check for exact or fuzzy match
    const matchResult = this.findSkillMatch(skill, candidateSkills);
    
    let candidateLevel: number;
    let matchStatus: 'strong' | 'moderate' | 'weak' | 'missing';

    if (matchResult.matched) {
      // Skill is present - estimate proficiency based on match quality
      if (matchResult.exactMatch) {
        candidateLevel = 85; // Exact match suggests good proficiency
      } else {
        candidateLevel = 65; // Fuzzy match suggests moderate proficiency
      }

      // Adjust based on whether it's a core technology
      if (this.isCoreSkill(skill)) {
        candidateLevel += 10;
      }

      // Determine match status
      if (candidateLevel >= 80) {
        matchStatus = 'strong';
      } else if (candidateLevel >= 50) {
        matchStatus = 'moderate';
      } else {
        matchStatus = 'weak';
      }
    } else {
      // Skill is not present
      candidateLevel = 0;
      matchStatus = 'missing';
    }

    const gap = 100 - candidateLevel;

    return {
      skill,
      required: isRequired,
      candidateLevel,
      matchStatus,
      gap,
    };
  }

  /**
   * Find skill match using NLP-based skill normalizer
   * (e.g., "Node" matches "NodeJS", "node.js", "node js")
   */
  private findSkillMatch(
    targetSkill: string,
    candidateSkills: string[]
  ): { matched: boolean; exactMatch: boolean } {
    // Use NLP-based skill normalizer for accurate matching
    const matchingSkill = candidateSkills.find(candidateSkill => 
      skillNormalizerService.skillsMatch(targetSkill, candidateSkill)
    );

    if (matchingSkill) {
      // Check if it's an exact match (same canonical form)
      const targetNormalized = skillNormalizerService.normalizeSkill(targetSkill);
      const candidateNormalized = skillNormalizerService.normalizeSkill(matchingSkill);
      const exactMatch = targetNormalized === candidateNormalized;
      return { matched: true, exactMatch };
    }

    return { matched: false, exactMatch: false };
  }

  /**
   * Check if skill is a core technology (adjust proficiency accordingly)
   */
  private isCoreSkill(skill: string): boolean {
    const coreSkills = [
      'react', 'angular', 'vue', 'node', 'python', 'java', 'javascript',
      'typescript', 'mongodb', 'postgresql', 'mysql', 'docker', 'kubernetes',
      'aws', 'azure', 'gcp', 'git'
    ];

    return coreSkills.some(core =>
      skill.toLowerCase().includes(core)
    );
  }

  /**
   * Generate summary text
   */
  private generateSummary(
    totalRequired: number,
    strongCount: number,
    moderateCount: number,
    weakCount: number,
    missingCount: number,
    overallMatch: number
  ): string {
    let summary = `Overall skill match: ${overallMatch}%. `;

    if (overallMatch >= 80) {
      summary += `Excellent alignment! `;
    } else if (overallMatch >= 60) {
      summary += `Good alignment with some gaps. `;
    } else {
      summary += `Significant skill gaps identified. `;
    }

    summary += `Out of ${totalRequired} required skills: `;
    summary += `${strongCount} strong, `;
    summary += `${moderateCount} moderate, `;
    summary += `${weakCount} weak, `;
    summary += `${missingCount} missing.`;

    if (missingCount > 0) {
      summary += ` Focus on validating experience with missing skills during interview.`;
    }

    return summary;
  }
}

export default new SkillGapService();
