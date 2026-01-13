/**
 * LeetCode Service
 * Fetches user statistics from LeetCode's public GraphQL API (no auth required)
 */

interface LeetCodeStats {
  username: string;
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  ranking: number | null;
  score: number; // Calculated score for evaluation
}

interface LeetCodeError {
  error: string;
  username: string;
}

const LEETCODE_GRAPHQL_API = 'https://leetcode.com/graphql';

// GraphQL query to fetch user's submission stats
const USER_STATS_QUERY = `
  query getUserProfile($username: String!) {
    matchedUser(username: $username) {
      username
      profile {
        ranking
      }
      submitStats {
        acSubmissionNum {
          difficulty
          count
        }
      }
    }
  }
`;

/**
 * Fetch LeetCode stats for a user
 */
export const fetchLeetCodeStats = async (username: string): Promise<LeetCodeStats | LeetCodeError> => {
  try {
    // Clean username - remove URL if provided
    const cleanUsername = username
      .replace(/^https?:\/\/(www\.)?leetcode\.com\/(u\/)?/i, '')
      .replace(/\/$/, '')
      .trim();

    if (!cleanUsername) {
      return { error: 'Invalid LeetCode username', username };
    }

    const response = await fetch(LEETCODE_GRAPHQL_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query: USER_STATS_QUERY,
        variables: { username: cleanUsername }
      })
    });

    if (!response.ok) {
      throw new Error(`LeetCode API error: ${response.status}`);
    }

    const data: any = await response.json();

    if (data.errors || !data.data?.matchedUser) {
      return { error: 'User not found on LeetCode', username: cleanUsername };
    }

    const user = data.data.matchedUser;
    const submissions = user.submitStats?.acSubmissionNum || [];

    // Parse submission counts by difficulty
    let totalSolved = 0;
    let easySolved = 0;
    let mediumSolved = 0;
    let hardSolved = 0;

    for (const sub of submissions) {
      switch (sub.difficulty) {
        case 'All':
          totalSolved = sub.count;
          break;
        case 'Easy':
          easySolved = sub.count;
          break;
        case 'Medium':
          mediumSolved = sub.count;
          break;
        case 'Hard':
          hardSolved = sub.count;
          break;
      }
    }

    // Calculate score (weighted by difficulty)
    // Easy: 1 point, Medium: 3 points, Hard: 5 points
    // Max reasonable score normalized to 100
    const rawScore = easySolved * 1 + mediumSolved * 3 + hardSolved * 5;
    // Score of 500 points (e.g., 100 easy + 100 medium + 20 hard) = 100
    const score = Math.min(100, Math.round((rawScore / 500) * 100));

    return {
      username: cleanUsername,
      totalSolved,
      easySolved,
      mediumSolved,
      hardSolved,
      ranking: user.profile?.ranking || null,
      score
    };
  } catch (error: any) {
    console.error('LeetCode fetch error:', error.message);
    return { error: error.message || 'Failed to fetch LeetCode data', username };
  }
};

/**
 * Calculate a LeetCode score for candidate evaluation
 * Returns a score from 0-100 based on problems solved
 */
export const calculateLeetCodeScore = (stats: LeetCodeStats): number => {
  return stats.score;
};

/**
 * Get insights based on LeetCode performance
 */
export const getLeetCodeInsights = (stats: LeetCodeStats): string[] => {
  const insights: string[] = [];

  if (stats.totalSolved >= 500) {
    insights.push('Exceptional problem solver with 500+ problems solved');
  } else if (stats.totalSolved >= 200) {
    insights.push('Strong problem-solving skills with 200+ problems solved');
  } else if (stats.totalSolved >= 100) {
    insights.push('Good algorithmic foundation with 100+ problems solved');
  } else if (stats.totalSolved >= 50) {
    insights.push('Developing problem-solving skills');
  }

  if (stats.hardSolved >= 50) {
    insights.push('Expert at tackling hard algorithmic challenges');
  } else if (stats.hardSolved >= 20) {
    insights.push('Comfortable with difficult problems');
  }

  if (stats.mediumSolved >= 100) {
    insights.push('Strong medium-difficulty problem experience');
  }

  const hardRatio = stats.totalSolved > 0 ? stats.hardSolved / stats.totalSolved : 0;
  if (hardRatio >= 0.2) {
    insights.push('High hard-to-total problem ratio indicates strong skills');
  }

  if (stats.ranking && stats.ranking <= 50000) {
    insights.push(`Top LeetCode ranking: #${stats.ranking.toLocaleString()}`);
  }

  return insights;
};

export const leetCodeService = {
  fetchLeetCodeStats,
  calculateLeetCodeScore,
  getLeetCodeInsights
};

export default leetCodeService;
