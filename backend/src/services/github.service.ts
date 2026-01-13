import axios from 'axios';
import perplexityService from './perplexity.service';

const GITHUB_API_BASE = 'https://api.github.com';

export interface GitHubUser {
  login: string;
  name: string;
  bio: string;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
  updated_at: string;
}

export interface GitHubRepo {
  name: string;
  description: string;
  language: string;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  size: number;
}

export interface GitHubActivity {
  type: string;
  created_at: string;
  repo: {
    name: string;
  };
  payload?: {
    commits?: Array<{ sha: string; message: string }>;
    size?: number;
  };
}

export interface GitHubAnalysis {
  username: string;
  profileData: {
    name: string;
    bio: string;
    publicRepos: number;
    followers: number;
    accountAge: number; // in days
  };
  activityScore: number; // 0-100
  topLanguages: { language: string; count: number }[];
  recentActivity: {
    totalEvents: number;
    commitCount: number;
    lastActiveDate: string;
  };
  topRepositories: {
    name: string;
    language: string;
    stars: number;
    description?: string;
  }[];
  insights: string[];
  strengths?: string[]; // AI-generated strengths
  recommendations?: string[]; // AI-generated recommendations
  overallScore: number; // 0-100
}

class GitHubService {
  private getHeaders() {
    const token = process.env.GITHUB_TOKEN;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async getUserProfile(username: string): Promise<GitHubUser> {
    try {
      console.log(`📡 Fetching GitHub user: ${username}`);
      const response = await axios.get(`${GITHUB_API_BASE}/users/${username}`, {
        headers: this.getHeaders(),
        timeout: 10000, // 10 second timeout
      });
      console.log(`✅ GitHub user fetched: ${response.data.login}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error(`GitHub user '${username}' not found. Please check the username and try again.`);
      }
      if (error.response?.status === 403) {
        throw new Error('GitHub API rate limit exceeded. Please try again later.');
      }
      if (error.code === 'ECONNABORTED') {
        throw new Error('GitHub API request timeout. Please check your internet connection.');
      }
      console.error('GitHub API error:', error.response?.status, error.message);
      throw new Error('Failed to fetch GitHub profile. Please try again.');
    }
  }

  async getUserRepos(username: string, maxRepos: number = 100): Promise<GitHubRepo[]> {
    try {
      const response = await axios.get(
        `${GITHUB_API_BASE}/users/${username}/repos`,
        {
          headers: this.getHeaders(),
          params: {
            sort: 'updated',
            per_page: maxRepos,
          },
        }
      );
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch GitHub repositories');
    }
  }

  async getUserActivity(username: string): Promise<GitHubActivity[]> {
    try {
      const response = await axios.get(
        `${GITHUB_API_BASE}/users/${username}/events/public`,
        {
          headers: this.getHeaders(),
          params: { per_page: 100 },
        }
      );
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch GitHub activity');
    }
  }

  async analyzeGitHubProfile(username: string): Promise<GitHubAnalysis> {
    try {
      console.log(`🔬 Starting GitHub analysis for: ${username}`);
      
      // Fetch all data in parallel
      const [profile, repos, activity] = await Promise.all([
        this.getUserProfile(username),
        this.getUserRepos(username),
        this.getUserActivity(username),
      ]);

      console.log(`📊 Data fetched: ${repos.length} repos, ${activity.length} events`);

      // Calculate account age
      const accountAge = Math.floor(
        (Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24)
      );

      // Analyze languages
      const languageCounts: Record<string, number> = {};
      repos.forEach((repo) => {
        if (repo.language) {
          languageCounts[repo.language] = (languageCounts[repo.language] || 0) + 1;
        }
      });

      const topLanguages = Object.entries(languageCounts)
        .map(([language, count]) => ({ language, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Analyze recent activity (10 days window for more realistic scoring)
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

      const recentActivity = activity.filter(
        (event) => new Date(event.created_at) > tenDaysAgo
      );

      // Count actual commits from PushEvents (each PushEvent can have multiple commits)
      const pushEvents = recentActivity.filter(
        (event) => event.type === 'PushEvent'
      );
      
      // Calculate total commits from all push events
      const totalCommits = pushEvents.reduce((sum, event) => {
        // payload.commits contains array of commits, or payload.size has the count
        const commitCount = event.payload?.commits?.length || event.payload?.size || 0;
        return sum + commitCount;
      }, 0);

      // Keep commitEvents for backward compatibility but use totalCommits for accurate count
      const commitEvents = pushEvents;

      // Get top repositories
      const topRepositories = repos
        .sort((a, b) => b.stargazers_count - a.stargazers_count)
        .slice(0, 5)
        .map((repo) => ({
          name: repo.name,
          language: repo.language || 'Unknown',
          stars: repo.stargazers_count,
          description: repo.description || '',
        }));

      // Calculate activity score (0-100) - More balanced scoring
      let activityScore = 0;

      // Base score for having a GitHub account with repos (20 points)
      if (repos.length > 0) {
        activityScore += 20;
      }

      // Repo count (max 25 points) - more generous
      // 1 repo = 5 points, 5 repos = max
      activityScore += Math.min(repos.length * 5, 25);

      // Recent activity (max 20 points) - recent commits matter
      // 1 event = 2 points, 10 events in 10 days = max
      activityScore += Math.min(recentActivity.length * 2, 20);

      // Commit frequency (max 15 points) - rewards consistent activity
      // 1 commit = 3 points, 5 commits in 10 days = max
      activityScore += Math.min(totalCommits * 3, 15);

      // Followers (max 10 points) - nice to have but not critical
      // 1 follower = 1 point, 10 followers = max
      activityScore += Math.min(profile.followers * 1, 10);

      // Stars on repos (max 10 points) - indicates quality
      // 1 star = 1 point, 10+ stars = max
      const totalStars = repos.reduce((sum, repo) => sum + repo.stargazers_count, 0);
      activityScore += Math.min(totalStars * 1, 10);

      activityScore = Math.round(activityScore);

      // Use Gemini AI for intelligent analysis
      console.log('🤖 Generating AI-powered insights with Gemini...');
      const aiAnalysis = await perplexityService.analyzeGitHubProfile({
        username,
        name: profile.name || username,
        bio: profile.bio || '',
        publicRepos: profile.public_repos,
        followers: profile.followers,
        accountAge,
        topLanguages,
        topRepositories,
        recentCommits: totalCommits,
        totalStars,
      });

      // Combine activity score with AI score
      const overallScore = Math.round((activityScore + aiAnalysis.overallScore) / 2);

      console.log(`✅ Analysis complete: Activity=${activityScore}, AI=${aiAnalysis.overallScore}, Overall=${overallScore}, Commits(10d)=${totalCommits}`);

      return {
        username,
        profileData: {
          name: profile.name || username,
          bio: profile.bio || '',
          publicRepos: profile.public_repos,
          followers: profile.followers,
          accountAge,
        },
        activityScore,
        topLanguages,
        recentActivity: {
          totalEvents: recentActivity.length,
          commitCount: totalCommits,
          lastActiveDate: activity[0]?.created_at || profile.updated_at,
        },
        topRepositories,
        insights: aiAnalysis.insights,
        strengths: aiAnalysis.strengths,
        recommendations: aiAnalysis.recommendations,
        overallScore: Math.min(overallScore, 100),
      };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to analyze GitHub profile');
    }
  }
}

export default new GitHubService();
