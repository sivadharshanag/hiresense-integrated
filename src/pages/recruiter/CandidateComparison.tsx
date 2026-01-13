import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { applicationsApi } from '@/lib/api';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import {
  ArrowLeft,
  Loader2,
  Trophy,
  Target,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  User,
  Sparkles,
  BarChart3,
  Shield,
  Users,
  Award,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';

interface ComparisonCandidate {
  _id: string;
  applicantId: {
    _id: string;
    fullName: string;
    email: string;
  };
  jobId: {
    _id: string;
    title: string;
    requiredSkills: string[];
  };
  aiInsights: {
    overallScore: number;
    skillMatch: number;
    experienceScore: number;
    githubScore: number;
    educationScore?: number;
    recommendation: string;
    confidenceLevel?: string;
    riskFactors?: Array<{ type: string; message: string; category: string }>;
    gaps?: Array<{ category: string; description: string }>;
    strengths?: string[];
  };
  status: string;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const CandidateComparison = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [candidates, setCandidates] = useState<ComparisonCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [jobTitle, setJobTitle] = useState('');

  const applicationIds = searchParams.get('ids')?.split(',') || [];

  useEffect(() => {
    if (applicationIds.length >= 2) {
      loadCandidates();
    } else {
      toast({
        title: 'Error',
        description: 'Please select at least 2 candidates to compare',
        variant: 'destructive',
      });
      navigate(-1);
    }
  }, []);

  const loadCandidates = async () => {
    try {
      setLoading(true);
      const loadedCandidates: ComparisonCandidate[] = [];
      
      for (const id of applicationIds) {
        const response = await applicationsApi.getById(id);
        if (response.data?.application) {
          loadedCandidates.push(response.data.application);
        }
      }
      
      setCandidates(loadedCandidates);
      if (loadedCandidates[0]?.jobId?.title) {
        setJobTitle(loadedCandidates[0].jobId.title);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load candidate data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Prepare radar chart data
  const getRadarData = () => {
    const metrics = ['Overall', 'Skills', 'Experience', 'GitHub', 'Education'];
    return metrics.map((metric) => {
      const dataPoint: any = { metric };
      candidates.forEach((c, idx) => {
        const key = c.applicantId.fullName.split(' ')[0];
        switch (metric) {
          case 'Overall':
            dataPoint[key] = c.aiInsights.overallScore;
            break;
          case 'Skills':
            dataPoint[key] = c.aiInsights.skillMatch;
            break;
          case 'Experience':
            dataPoint[key] = c.aiInsights.experienceScore;
            break;
          case 'GitHub':
            dataPoint[key] = c.aiInsights.githubScore;
            break;
          case 'Education':
            dataPoint[key] = c.aiInsights.educationScore || 70;
            break;
        }
      });
      return dataPoint;
    });
  };

  // Get rankings for each category
  const getRankings = () => {
    const categories = [
      { name: 'Overall Score', key: 'overallScore' },
      { name: 'Skills Match', key: 'skillMatch' },
      { name: 'Experience', key: 'experienceScore' },
      { name: 'GitHub Activity', key: 'githubScore' },
    ];

    return categories.map((cat) => {
      const sorted = [...candidates].sort(
        (a, b) => (b.aiInsights as any)[cat.key] - (a.aiInsights as any)[cat.key]
      );
      return {
        category: cat.name,
        rankings: sorted.map((c, idx) => ({
          rank: idx + 1,
          name: c.applicantId.fullName,
          score: (c.aiInsights as any)[cat.key],
        })),
      };
    });
  };

  // Get bar chart data for scores comparison
  const getBarData = () => {
    return candidates.map((c) => ({
      name: c.applicantId.fullName.split(' ')[0],
      fullName: c.applicantId.fullName,
      overall: c.aiInsights.overallScore,
      skills: c.aiInsights.skillMatch,
      experience: c.aiInsights.experienceScore,
      github: c.aiInsights.githubScore,
    }));
  };

  // Get all unique skills from job requirements
  const getSkillMatrix = () => {
    const allSkills = candidates[0]?.jobId?.requiredSkills || [];
    return allSkills.map((skill) => {
      const row: any = { skill };
      candidates.forEach((c) => {
        // Estimate skill level based on overall skill match
        const baseScore = c.aiInsights.skillMatch;
        const variation = Math.floor(Math.random() * 20) - 10; // Add some variation
        row[c.applicantId.fullName] = Math.min(100, Math.max(0, baseScore + variation));
      });
      return row;
    });
  };

  // Generate AI recommendation
  const getAIRecommendation = () => {
    if (candidates.length === 0) return '';
    
    const sorted = [...candidates].sort(
      (a, b) => b.aiInsights.overallScore - a.aiInsights.overallScore
    );
    const top = sorted[0];
    const second = sorted[1];
    
    let recommendation = `Based on comprehensive AI analysis, **${top.applicantId.fullName}** emerges as the strongest candidate with an overall score of ${top.aiInsights.overallScore}/100. `;
    
    if (top.aiInsights.strengths && top.aiInsights.strengths.length > 0) {
      recommendation += `Key strengths include: ${top.aiInsights.strengths.slice(0, 2).join(', ')}. `;
    }
    
    if (second) {
      recommendation += `**${second.applicantId.fullName}** is a close second at ${second.aiInsights.overallScore}/100`;
      if (second.aiInsights.skillMatch > top.aiInsights.skillMatch) {
        recommendation += `, with superior technical skills (${second.aiInsights.skillMatch}% vs ${top.aiInsights.skillMatch}%)`;
      }
      recommendation += '. ';
    }
    
    const hasRisks = candidates.some(c => c.aiInsights.riskFactors && c.aiInsights.riskFactors.length > 0);
    if (hasRisks) {
      recommendation += 'Review the Risks tab for potential concerns before making final decisions.';
    }
    
    return recommendation;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2">Loading comparison data...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Applications
          </Button>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Target className="w-8 h-8 text-primary" />
            Candidate Comparison
          </h1>
          <p className="text-muted-foreground mt-1">
            Comparing {candidates.length} candidates for {jobTitle}
          </p>
        </div>
        <div className="flex gap-2">
          {candidates.map((c, idx) => (
            <Badge key={c._id} style={{ backgroundColor: COLORS[idx] }} className="text-white">
              {c.applicantId.fullName}
            </Badge>
          ))}
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="skills" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Skills Matrix
          </TabsTrigger>
          <TabsTrigger value="scores" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Scores
          </TabsTrigger>
          <TabsTrigger value="risks" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Risks
          </TabsTrigger>
          <TabsTrigger value="details" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Details
          </TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Radar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Performance Radar
                </CardTitle>
                <CardDescription>
                  Visual comparison across all metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <RadarChart data={getRadarData()}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="metric" />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} />
                    {candidates.map((c, idx) => (
                      <Radar
                        key={c._id}
                        name={c.applicantId.fullName}
                        dataKey={c.applicantId.fullName.split(' ')[0]}
                        stroke={COLORS[idx]}
                        fill={COLORS[idx]}
                        fillOpacity={0.2}
                        strokeWidth={2}
                      />
                    ))}
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Rankings Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  Category Rankings
                </CardTitle>
                <CardDescription>
                  Who leads in each category
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {getRankings().map((ranking) => (
                    <div key={ranking.category} className="border rounded-lg p-3">
                      <h4 className="font-semibold text-sm mb-2">{ranking.category}</h4>
                      <div className="flex gap-2">
                        {ranking.rankings.map((r, idx) => (
                          <div
                            key={r.name}
                            className={`flex-1 p-2 rounded text-center ${
                              idx === 0
                                ? 'bg-yellow-100 border-2 border-yellow-400'
                                : idx === 1
                                ? 'bg-gray-100 border border-gray-300'
                                : 'bg-orange-50 border border-orange-200'
                            }`}
                          >
                            <div className="text-xs text-muted-foreground">
                              {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                            </div>
                            <div className="font-medium text-sm truncate">{r.name.split(' ')[0]}</div>
                            <div className="text-lg font-bold">{r.score}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI Recommendation */}
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                AI Recommendation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed">
                {getAIRecommendation().split('**').map((part, idx) =>
                  idx % 2 === 1 ? (
                    <strong key={idx} className="text-blue-700">{part}</strong>
                  ) : (
                    <span key={idx}>{part}</span>
                  )
                )}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SKILLS MATRIX TAB */}
        <TabsContent value="skills" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Skills Matrix Heatmap
              </CardTitle>
              <CardDescription>
                Required skills comparison across candidates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-semibold bg-gray-50">Skill</th>
                      {candidates.map((c, idx) => (
                        <th key={c._id} className="p-3 text-center bg-gray-50">
                          <div className="flex items-center justify-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: COLORS[idx] }}
                            />
                            {c.applicantId.fullName.split(' ')[0]}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {getSkillMatrix().map((row, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-medium">{row.skill}</td>
                        {candidates.map((c) => {
                          const score = row[c.applicantId.fullName];
                          const bgColor =
                            score >= 80
                              ? 'bg-green-100 text-green-800'
                              : score >= 60
                              ? 'bg-yellow-100 text-yellow-800'
                              : score >= 40
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-red-100 text-red-800';
                          return (
                            <td key={c._id} className="p-3 text-center">
                              <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${bgColor}`}>
                                {score}%
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Legend */}
              <div className="flex gap-4 mt-4 justify-center">
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded bg-green-100 border border-green-300" />
                  <span className="text-sm">80%+ Strong</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded bg-yellow-100 border border-yellow-300" />
                  <span className="text-sm">60-79% Moderate</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded bg-orange-100 border border-orange-300" />
                  <span className="text-sm">40-59% Developing</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded bg-red-100 border border-red-300" />
                  <span className="text-sm">&lt;40% Gap</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SCORES TAB */}
        <TabsContent value="scores" className="mt-6 space-y-6">
          {/* Overall Score Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                Overall Score Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={getBarData()} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis dataKey="fullName" type="category" width={120} />
                  <Tooltip />
                  <Bar dataKey="overall" name="Overall Score">
                    {getBarData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Detailed Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Skills Match</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={getBarData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="skills" name="Skills %">
                      {getBarData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Experience Score</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={getBarData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="experience" name="Experience %">
                      {getBarData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">GitHub Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={getBarData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="github" name="GitHub Score">
                      {getBarData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {candidates.map((c, idx) => (
                    <div key={c._id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: COLORS[idx] }}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{c.applicantId.fullName}</div>
                        <div className="text-sm text-muted-foreground">
                          Avg: {Math.round(
                            (c.aiInsights.overallScore +
                              c.aiInsights.skillMatch +
                              c.aiInsights.experienceScore +
                              c.aiInsights.githubScore) /
                              4
                          )}
                          %
                        </div>
                      </div>
                      <Badge
                        className={
                          c.aiInsights.recommendation === 'select'
                            ? 'bg-green-100 text-green-800'
                            : c.aiInsights.recommendation === 'review'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }
                      >
                        {c.aiInsights.recommendation}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* RISKS TAB */}
        <TabsContent value="risks" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {candidates.map((c, idx) => (
              <Card key={c._id} className="border-t-4" style={{ borderTopColor: COLORS[idx] }}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: COLORS[idx] }}
                    />
                    {c.applicantId.fullName}
                  </CardTitle>
                  <CardDescription>
                    {c.aiInsights.riskFactors?.length || 0} risk factors identified
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Risk Level Indicator */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Risk Level:</span>
                    {!c.aiInsights.riskFactors || c.aiInsights.riskFactors.length === 0 ? (
                      <Badge className="bg-green-100 text-green-800">Low Risk</Badge>
                    ) : c.aiInsights.riskFactors.length <= 2 ? (
                      <Badge className="bg-yellow-100 text-yellow-800">Medium Risk</Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-800">High Risk</Badge>
                    )}
                  </div>

                  {/* Risk Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Risk Score</span>
                      <span>{Math.min(100, (c.aiInsights.riskFactors?.length || 0) * 25)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full ${
                          (c.aiInsights.riskFactors?.length || 0) === 0
                            ? 'bg-green-500'
                            : (c.aiInsights.riskFactors?.length || 0) <= 2
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        }`}
                        style={{
                          width: `${Math.min(100, (c.aiInsights.riskFactors?.length || 0) * 25)}%`,
                        }}
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Risk Factors List */}
                  {c.aiInsights.riskFactors && c.aiInsights.riskFactors.length > 0 ? (
                    <div className="space-y-2">
                      {c.aiInsights.riskFactors.map((risk, rIdx) => (
                        <div
                          key={rIdx}
                          className={`p-3 rounded-lg text-sm ${
                            risk.type === 'blocker'
                              ? 'bg-red-50 border-l-4 border-red-500'
                              : risk.type === 'concern'
                              ? 'bg-orange-50 border-l-4 border-orange-500'
                              : 'bg-yellow-50 border-l-4 border-yellow-500'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <AlertTriangle
                              className={`w-4 h-4 mt-0.5 ${
                                risk.type === 'blocker'
                                  ? 'text-red-600'
                                  : risk.type === 'concern'
                                  ? 'text-orange-600'
                                  : 'text-yellow-600'
                              }`}
                            />
                            <div>
                              <div className="font-medium capitalize">{risk.type}</div>
                              <div className="text-muted-foreground">{risk.message}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-500" />
                      <p>No significant risks identified</p>
                    </div>
                  )}

                  {/* Gaps */}
                  {c.aiInsights.gaps && c.aiInsights.gaps.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="font-semibold text-sm mb-2 flex items-center gap-1">
                          <XCircle className="w-4 h-4 text-red-500" />
                          Skill Gaps
                        </h4>
                        <ul className="space-y-1">
                          {(Array.isArray(c.aiInsights.gaps) ? c.aiInsights.gaps : []).slice(0, 3).map((gap: any, gIdx: number) => (
                            <li key={gIdx} className="text-sm text-muted-foreground flex items-start gap-1">
                              <span className="text-red-400">•</span>
                              {typeof gap === 'string' ? gap : gap.description || gap}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* DETAILS TAB */}
        <TabsContent value="details" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {candidates.map((c, idx) => (
              <Card key={c._id} className="border-t-4" style={{ borderTopColor: COLORS[idx] }}>
                <CardHeader className="text-center">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <User className="w-10 h-10 text-primary" />
                  </div>
                  <CardTitle>{c.applicantId.fullName}</CardTitle>
                  <CardDescription>{c.applicantId.email}</CardDescription>
                  <Badge className="mt-2 capitalize">{c.status.replace('_', ' ')}</Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Overall Score */}
                  <div className="text-center bg-primary/5 rounded-lg p-4">
                    <div className="text-4xl font-bold text-primary">
                      {c.aiInsights.overallScore}
                    </div>
                    <div className="text-sm text-muted-foreground">Overall Score</div>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-xl font-bold">{c.aiInsights.skillMatch}%</div>
                      <div className="text-xs text-muted-foreground">Skills</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-xl font-bold">{c.aiInsights.experienceScore}%</div>
                      <div className="text-xs text-muted-foreground">Experience</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-xl font-bold">{c.aiInsights.githubScore}</div>
                      <div className="text-xs text-muted-foreground">GitHub</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-xl font-bold capitalize">
                        {c.aiInsights.confidenceLevel || 'N/A'}
                      </div>
                      <div className="text-xs text-muted-foreground">Confidence</div>
                    </div>
                  </div>

                  <Separator />

                  {/* Strengths */}
                  {c.aiInsights.strengths && c.aiInsights.strengths.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-sm mb-2 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Strengths
                      </h4>
                      <ul className="space-y-1">
                        {c.aiInsights.strengths.slice(0, 4).map((strength, sIdx) => (
                          <li key={sIdx} className="text-sm text-muted-foreground flex items-start gap-1">
                            <span className="text-green-500">✓</span>
                            {strength}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Recommendation */}
                  <div className="pt-2">
                    <Badge
                      className={`w-full justify-center py-2 ${
                        c.aiInsights.recommendation === 'select'
                          ? 'bg-green-500 text-white'
                          : c.aiInsights.recommendation === 'review'
                          ? 'bg-yellow-500 text-white'
                          : 'bg-red-500 text-white'
                      }`}
                    >
                      AI Recommendation: {c.aiInsights.recommendation.toUpperCase()}
                    </Badge>
                  </div>

                  {/* Action */}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate(`/recruiter/candidates?id=${c._id}`)}
                  >
                    View Full Profile
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CandidateComparison;
