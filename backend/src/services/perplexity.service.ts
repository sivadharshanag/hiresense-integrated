import { GoogleGenerativeAI } from '@google/generative-ai';

class GeminiGitHubService {
  private genAI: GoogleGenerativeAI | null;
  private isEnabled: boolean;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || '';
    this.isEnabled = apiKey.length > 0;
    
    if (!this.isEnabled) {
      console.warn('⚠️  Gemini API not configured. Using basic GitHub analysis.');
      this.genAI = null;
    } else {
      this.genAI = new GoogleGenerativeAI(apiKey);
      console.log('✅ Gemini AI service initialized for GitHub analysis');
    }
  }

  async analyzeGitHubProfile(githubData: {
    username: string;
    name: string;
    bio: string;
    publicRepos: number;
    followers: number;
    accountAge: number;
    topLanguages: Array<{ language: string; count: number }>;
    topRepositories: Array<{ name: string; language: string; stars: number; description: string }>;
    recentCommits: number;
    totalStars: number;
  }): Promise<{
    insights: string[];
    overallScore: number;
    strengths: string[];
    recommendations: string[];
  }> {
    if (!this.isEnabled) {
      // Return basic analysis if Perplexity is not configured
      return this.basicAnalysis(githubData);
    }

    try {
      console.log(`🤖 Requesting Gemini AI analysis for: ${githubData.username}`);

      const model = this.genAI!.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const prompt = `Analyze this GitHub developer profile and provide insights:

Username: ${githubData.username}
Name: ${githubData.name || 'Not provided'}
Bio: ${githubData.bio || 'Not provided'}
Account Age: ${Math.floor(githubData.accountAge / 365)} years
Public Repositories: ${githubData.publicRepos}
Followers: ${githubData.followers}
Total Stars: ${githubData.totalStars}
Recent Commits (10 days): ${githubData.recentCommits}

Top Programming Languages:
${githubData.topLanguages.map(l => `- ${l.language} (${l.count} repos)`).join('\n')}

Top Repositories:
${githubData.topRepositories.slice(0, 5).map(r => `- ${r.name} (${r.language}) - ${r.stars} stars${r.description ? `: ${r.description}` : ''}`).join('\n')}

Based on this profile, provide:
1. Overall Score (0-100): Rate this developer's profile quality and activity
2. Key Strengths (3-5 points): What stands out positively?
3. Key Insights (3-5 points): Notable observations about their coding style, expertise, or contributions
4. Recommendations (2-3 points): How can they improve their profile?

Format your response as JSON ONLY (no markdown, no code blocks):
{
  "overallScore": number,
  "strengths": ["strength1", "strength2", ...],
  "insights": ["insight1", "insight2", ...],
  "recommendations": ["rec1", "rec2", ...]
}`;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const content = response.text();

      if (!content) {
        throw new Error('Empty response from Gemini API');
      }

      // Parse JSON from response (handle markdown code blocks)
      let jsonContent = content.trim();
      if (jsonContent.startsWith('```json')) {
        jsonContent = jsonContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      } else if (jsonContent.startsWith('```')) {
        jsonContent = jsonContent.replace(/```\n?/g, '').trim();
      }

      const analysis = JSON.parse(jsonContent);

      console.log(`✅ Gemini analysis complete. Score: ${analysis.overallScore}/100`);

      return {
        insights: analysis.insights || [],
        overallScore: Math.min(Math.max(analysis.overallScore || 50, 0), 100),
        strengths: analysis.strengths || [],
        recommendations: analysis.recommendations || [],
      };
    } catch (error: any) {
      console.error('❌ Gemini API error:', error.message);
      
      // Fallback to basic analysis
      console.log('⚠️  Falling back to basic analysis');
      return this.basicAnalysis(githubData);
    }
  }

  private basicAnalysis(githubData: {
    username: string;
    publicRepos: number;
    followers: number;
    accountAge: number;
    topLanguages: Array<{ language: string; count: number }>;
    recentCommits: number;
    totalStars: number;
  }): {
    insights: string[];
    overallScore: number;
    strengths: string[];
    recommendations: string[];
  } {
    const insights: string[] = [];
    const strengths: string[] = [];
    const recommendations: string[] = [];

    // Activity scoring
    const activityScore = Math.min((githubData.recentCommits / 30) * 100, 100);
    
    // Repository scoring
    const repoScore = Math.min((githubData.publicRepos / 20) * 100, 100);
    
    // Popularity scoring
    const popularityScore = Math.min((githubData.followers / 50) * 100, 100);
    
    // Stars scoring
    const starsScore = Math.min((githubData.totalStars / 100) * 100, 100);

    // Calculate overall score
    const overallScore = Math.round(
      activityScore * 0.4 + 
      repoScore * 0.3 + 
      popularityScore * 0.15 + 
      starsScore * 0.15
    );

    // Generate insights
    if (githubData.topLanguages.length > 0) {
      const topLang = githubData.topLanguages[0];
      insights.push(`Primary expertise in ${topLang.language}`);
      strengths.push(`Strong ${topLang.language} developer`);
    }

    if (githubData.topLanguages.length >= 3) {
      insights.push(`Multi-language proficiency (${githubData.topLanguages.length} languages)`);
      strengths.push('Versatile across multiple programming languages');
    }

    if (githubData.recentCommits > 20) {
      insights.push('Highly active contributor');
      strengths.push('Consistently active on GitHub');
    } else if (githubData.recentCommits < 5) {
      recommendations.push('Increase coding activity and commit frequency');
    }

    if (githubData.totalStars > 50) {
      insights.push(`Popular projects with ${githubData.totalStars} total stars`);
      strengths.push('Creates impactful, starred repositories');
    }

    if (githubData.publicRepos < 5) {
      recommendations.push('Build more public projects to showcase skills');
    }

    if (githubData.followers < 10) {
      recommendations.push('Engage with the community to grow your network');
    }

    const accountYears = Math.floor(githubData.accountAge / 365);
    if (accountYears >= 2) {
      insights.push(`Experienced GitHub user (${accountYears} years)`);
    }

    return {
      insights: insights.length > 0 ? insights : ['Active GitHub profile'],
      overallScore: Math.min(overallScore, 100),
      strengths: strengths.length > 0 ? strengths : ['Active developer'],
      recommendations: recommendations.length > 0 ? recommendations : ['Keep up the good work!'],
    };
  }
}

export default new GeminiGitHubService();
