import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { aiApi, applicantApi } from '@/lib/api';
import {
  User,
  FileText,
  Briefcase,
  GraduationCap,
  Target,
  Upload,
  X,
  Plus,
  Github,
  Loader2,
  Save,
  Sparkles,
  FolderGit2,
  ExternalLink,
  Trash2,
  Award,
  Calendar,
  Link,
  Camera,
  MapPin,
  Mail,
} from 'lucide-react';

const ApplicantProfile = () => {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();

  interface Experience {
    company: string;
    role: string;
    startDate: string;
    endDate: string;
    current: boolean;
    description: string;
  }

  interface Project {
    name: string;
    description: string;
    techStack: string[];
    githubUrl: string;
    liveUrl: string;
  }

  interface Certification {
    name: string;
    issuer: string;
    issueDate: string;
    expiryDate: string;
    credentialId: string;
    credentialUrl: string;
  }

  const [profile, setProfile] = useState({
    resume: null as File | null,
    resumeUrl: '',
    resumeFileName: '',
    skills: [] as string[],
    experiences: [] as Experience[],
    education: '',
    preferredRoles: [] as string[],
    githubUsername: '',
    leetcodeUsername: '',
    yearsOfExperience: 0,
    bio: '',
    location: '',
    linkedinUrl: '',
    portfolioUrl: '',
    projects: [] as Project[],
    certifications: [] as Certification[],
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  const [newRole, setNewRole] = useState('');
  const [analyzingGitHub, setAnalyzingGitHub] = useState(false);
  const [githubAnalysis, setGithubAnalysis] = useState<any>(null);
  const [analyzingLeetCode, setAnalyzingLeetCode] = useState(false);
  const [leetcodeStats, setLeetcodeStats] = useState<any>(null);
  const [parsingResume, setParsingResume] = useState(false);
  const [newProject, setNewProject] = useState<Project>({
    name: '',
    description: '',
    techStack: [],
    githubUrl: '',
    liveUrl: '',
  });
  const [newCertification, setNewCertification] = useState<Certification>({
    name: '',
    issuer: '',
    issueDate: '',
    expiryDate: '',
    credentialId: '',
    credentialUrl: '',
  });
  const [showCertForm, setShowCertForm] = useState(false);
  const [newTech, setNewTech] = useState('');
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [newExperience, setNewExperience] = useState<Experience>({
    company: '',
    role: '',
    startDate: '',
    endDate: '',
    current: false,
    description: '',
  });
  const [showExperienceForm, setShowExperienceForm] = useState(false);

  // Initialize avatar from user context
  useEffect(() => {
    if (user?.avatarUrl) {
      setAvatarUrl(user.avatarUrl);
    }
  }, [user]);

  // Handle avatar upload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please select an image under 2MB',
        variant: 'destructive',
      });
      return;
    }

    setUploadingAvatar(true);
    try {
      const response = await applicantApi.uploadAvatar(file);
      if (response.data?.avatarUrl) {
        setAvatarUrl(response.data.avatarUrl);
        // Update the auth context so avatar persists across the app
        updateUser({ avatarUrl: response.data.avatarUrl });
        toast({
          title: 'Success',
          description: 'Profile picture updated successfully',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload profile picture',
        variant: 'destructive',
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Fetch profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const response = await applicantApi.getProfile();
        if (response.data?.profile) {
          const p = response.data.profile;
          // Map experiences from backend format
          const mappedExperiences = (p.experience || []).map((exp: any) => ({
            company: exp.company || '',
            role: exp.role || '',
            startDate: exp.startDate ? new Date(exp.startDate).toISOString().split('T')[0] : '',
            endDate: exp.endDate ? new Date(exp.endDate).toISOString().split('T')[0] : '',
            current: exp.current || false,
            description: exp.description || '',
          }));
          setProfile({
            resume: null,
            resumeUrl: p.resumeUrl || '',
            resumeFileName: p.resumeFileName || '',
            skills: p.skills || [],
            experiences: mappedExperiences,
            education: p.educationText || '',
            preferredRoles: p.preferredRoles || [],
            githubUsername: p.githubUsername || '',
            leetcodeUsername: p.leetcodeUsername || '',
            yearsOfExperience: p.yearsOfExperience || 0,
            bio: p.bio || '',
            location: p.location || '',
            linkedinUrl: p.linkedinUrl || '',
            portfolioUrl: p.portfolioUrl || '',
            projects: p.projects || [],
            certifications: p.certifications || [],
          });
          if (p.githubAnalysis?.score) {
            setGithubAnalysis(p.githubAnalysis);
          }
          if (p.leetcodeStats?.totalSolved !== undefined) {
            setLeetcodeStats(p.leetcodeStats);
          }
        }
      } catch (error: any) {
        console.log('No existing profile or error loading:', error.message);
        // Profile doesn't exist yet, that's okay - use defaults
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const completionFields = [
    profile.resumeUrl !== '' || profile.resume !== null,
    profile.skills.length > 0,
    profile.experiences.length > 0,
    profile.education.length > 0,
    profile.githubUsername.length > 0,
  ];
  const completionPercentage = Math.round(
    (completionFields.filter(Boolean).length / completionFields.length) * 100
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfile({ ...profile, resume: file });
      toast({
        title: 'Resume uploaded',
        description: `${file.name} has been uploaded successfully.`,
      });
    }
  };

  const addSkill = () => {
    if (newSkill.trim() && !profile.skills.includes(newSkill.trim())) {
      setProfile({ ...profile, skills: [...profile.skills, newSkill.trim()] });
      setNewSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    setProfile({ ...profile, skills: profile.skills.filter((s) => s !== skill) });
  };

  const addRole = () => {
    if (newRole.trim() && !profile.preferredRoles.includes(newRole.trim())) {
      setProfile({ ...profile, preferredRoles: [...profile.preferredRoles, newRole.trim()] });
      setNewRole('');
    }
  };

  const removeRole = (role: string) => {
    setProfile({ ...profile, preferredRoles: profile.preferredRoles.filter((r) => r !== role) });
  };

  const handleAnalyzeGitHub = async () => {
    if (!profile.githubUsername.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a GitHub username or profile URL',
        variant: 'destructive',
      });
      return;
    }

    // Extract username from GitHub URL if full URL is provided
    let username = profile.githubUsername.trim();
    const githubUrlPattern = /(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_-]+)/;
    const match = username.match(githubUrlPattern);
    if (match) {
      username = match[1]; // Extract username from URL
    }

    setAnalyzingGitHub(true);
    try {
      const response = await aiApi.analyzeGitHub(username);
      setGithubAnalysis(response.data.analysis);
      toast({
        title: 'GitHub Analysis Complete',
        description: `Your GitHub profile has been analyzed! Score: ${response.data.analysis.overallScore}/100`,
      });
    } catch (error: any) {
      toast({
        title: 'Analysis Failed',
        description: error.message || 'Could not analyze GitHub profile',
        variant: 'destructive',
      });
    } finally {
      setAnalyzingGitHub(false);
    }
  };

  const handleAnalyzeLeetCode = async () => {
    if (!profile.leetcodeUsername.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a LeetCode username or profile URL',
        variant: 'destructive',
      });
      return;
    }

    setAnalyzingLeetCode(true);
    try {
      const response = await applicantApi.analyzeLeetCode(profile.leetcodeUsername.trim());
      setLeetcodeStats(response.data);
      toast({
        title: 'LeetCode Analysis Complete',
        description: `Problems solved: ${response.data.totalSolved} (Score: ${response.data.score}/100)`,
      });
    } catch (error: any) {
      toast({
        title: 'Analysis Failed',
        description: error.message || 'Could not analyze LeetCode profile',
        variant: 'destructive',
      });
    } finally {
      setAnalyzingLeetCode(false);
    }
  };

  const handleParseResume = async () => {
    if (!profile.resume) {
      toast({
        title: 'No Resume Selected',
        description: 'Please upload a resume file first',
        variant: 'destructive',
      });
      return;
    }

    setParsingResume(true);
    try {
      const response = await applicantApi.parseResume(profile.resume);
      const parsedData = response.data;

      // Map parsed experiences to our format
      const parsedExperiences: Experience[] = (parsedData.experiences || [])
        .filter((exp: any) => exp.company && exp.role)
        .map((exp: any) => ({
          company: exp.company || '',
          role: exp.role || '',
          startDate: exp.startDate || '',
          endDate: exp.endDate || '',
          current: exp.current || false,
          description: exp.description || '',
        }));

      // Map parsed projects to our format
      const parsedProjects: Project[] = (parsedData.projects || [])
        .filter((proj: any) => proj.name)
        .map((proj: any) => ({
          name: proj.name || '',
          description: proj.description || '',
          techStack: proj.techStack || [],
          githubUrl: '',
          liveUrl: '',
        }));

      // Map parsed certifications to our format  
      const parsedCertifications: Certification[] = (parsedData.certifications || [])
        .filter((cert: string) => cert && cert.trim())
        .map((cert: string) => ({
          name: cert,
          issuer: '',
          issueDate: '',
          expiryDate: '',
          credentialId: '',
          credentialUrl: '',
        }));

      // Pre-fill form with parsed data (user can review and edit before saving)
      setProfile(prev => ({
        ...prev,
        skills: parsedData.skills && parsedData.skills.length > 0 ? parsedData.skills : prev.skills,
        yearsOfExperience: parsedData.yearsOfExperience || prev.yearsOfExperience,
        bio: parsedData.bio || prev.bio,
        location: parsedData.location || prev.location,
        linkedinUrl: parsedData.linkedinUrl || prev.linkedinUrl,
        portfolioUrl: parsedData.portfolioUrl || prev.portfolioUrl,
        githubUsername: parsedData.githubUsername || prev.githubUsername,
        education: parsedData.educationText || prev.education,
        experiences: parsedExperiences.length > 0 ? parsedExperiences : prev.experiences,
        projects: parsedProjects.length > 0 ? parsedProjects : prev.projects,
        certifications: parsedCertifications.length > 0 ? parsedCertifications : prev.certifications,
      }));

      // Build summary of what was extracted
      const extractedItems: string[] = [];
      if (parsedData.skills?.length) extractedItems.push(`${parsedData.skills.length} skills`);
      if (parsedExperiences.length) extractedItems.push(`${parsedExperiences.length} experience(s)`);
      if (parsedProjects.length) extractedItems.push(`${parsedProjects.length} project(s)`);
      if (parsedCertifications.length) extractedItems.push(`${parsedCertifications.length} certification(s)`);
      if (parsedData.bio) extractedItems.push('bio');
      if (parsedData.location) extractedItems.push('location');
      if (parsedData.githubUsername) extractedItems.push('GitHub');
      if (parsedData.linkedinUrl) extractedItems.push('LinkedIn');

      toast({
        title: '✨ Resume Parsed Successfully!',
        description: extractedItems.length > 0 
          ? `Extracted: ${extractedItems.join(', ')}. Review and click Save.`
          : 'Review the extracted details below and click Save to confirm.',
      });
    } catch (error: any) {
      toast({
        title: 'Parsing Failed',
        description: error.message || 'Could not parse resume. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setParsingResume(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      let resumeData: { resumeUrl?: string; resumeFileName?: string } = {};
      
      // Convert resume file to base64 if a new file was uploaded
      if (profile.resume) {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(profile.resume!);
        });
        const base64 = await base64Promise;
        resumeData = {
          resumeUrl: base64,
          resumeFileName: profile.resume.name,
        };
      }
      
      // Map experiences to backend format
      const experienceData = profile.experiences.map(exp => ({
        company: exp.company,
        role: exp.role,
        startDate: exp.startDate ? new Date(exp.startDate) : undefined,
        endDate: exp.current ? undefined : (exp.endDate ? new Date(exp.endDate) : undefined),
        current: exp.current,
        description: exp.description,
      }));

      await applicantApi.updateProfile({
        skills: profile.skills,
        preferredRoles: profile.preferredRoles,
        githubUsername: profile.githubUsername,
        leetcodeUsername: profile.leetcodeUsername,
        experience: experienceData,
        educationText: profile.education,
        yearsOfExperience: profile.yearsOfExperience,
        bio: profile.bio,
        location: profile.location,
        linkedinUrl: profile.linkedinUrl,
        portfolioUrl: profile.portfolioUrl,
        projects: profile.projects,
        certifications: profile.certifications,
        ...resumeData,
      });
      
      // Update local state with saved resume info
      if (resumeData.resumeUrl) {
        setProfile(prev => ({
          ...prev,
          resumeUrl: resumeData.resumeUrl!,
          resumeFileName: resumeData.resumeFileName!,
          resume: null, // Clear the file object since it's now saved
        }));
      }
      
      toast({
        title: 'Profile saved',
        description: 'Your profile has been updated successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Error saving profile',
        description: error.message || 'Could not save profile',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Profile Header - Enhanced with Avatar Upload */}
      <Card className="overflow-hidden">
        {/* Decorative header background */}
        <div className="h-24 bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMwMDAiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        </div>
        
        <CardContent className="p-6 -mt-12 relative">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Avatar Section */}
            <div className="flex flex-col items-center lg:items-start gap-3">
              <div className="relative group">
                {/* Avatar */}
                <div className="w-28 h-28 rounded-2xl overflow-hidden border-4 border-background shadow-lg bg-muted">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={user?.fullName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full gradient-primary flex items-center justify-center">
                      <span className="text-3xl font-bold text-primary-foreground">
                        {user?.fullName?.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Upload overlay */}
                <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-2xl">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleAvatarUpload}
                    className="hidden"
                    disabled={uploadingAvatar}
                  />
                  {uploadingAvatar ? (
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  ) : (
                    <Camera className="w-6 h-6 text-white" />
                  )}
                </label>
              </div>
              
              <span className="text-xs text-muted-foreground">Click to upload</span>
            </div>
            
            {/* Profile Info */}
            <div className="flex-1 text-center lg:text-left space-y-3 pt-2">
              <div>
                <h2 className="text-2xl font-bold text-foreground">{user?.fullName}</h2>
                {profile.bio && (
                  <p className="text-muted-foreground mt-1 line-clamp-2">{profile.bio}</p>
                )}
              </div>
              
              {/* Quick info badges */}
              <div className="flex flex-wrap justify-center lg:justify-start gap-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Mail className="w-4 h-4" />
                  <span>{user?.email}</span>
                </div>
                {profile.location && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    <span>{profile.location}</span>
                  </div>
                )}
                {profile.yearsOfExperience > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4" />
                    <span>{profile.yearsOfExperience} years exp.</span>
                  </div>
                )}
              </div>
              
              {/* Quick links */}
              {(profile.linkedinUrl || profile.portfolioUrl || profile.githubUsername) && (
                <div className="flex flex-wrap justify-center lg:justify-start gap-2 pt-1">
                  {profile.githubUsername && (
                    <a
                      href={`https://github.com/${profile.githubUsername}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 text-sm transition-colors"
                    >
                      <Github className="w-4 h-4" />
                      GitHub
                    </a>
                  )}
                  {profile.linkedinUrl && (
                    <a
                      href={profile.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 text-sm transition-colors"
                    >
                      <Link className="w-4 h-4" />
                      LinkedIn
                    </a>
                  )}
                  {profile.portfolioUrl && (
                    <a
                      href={profile.portfolioUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 text-sm transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Portfolio
                    </a>
                  )}
                </div>
              )}
            </div>
            
            {/* Completion Progress */}
            <div className="lg:w-48 w-full">
              <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Profile</span>
                  <span className="text-lg font-bold text-primary">{completionPercentage}%</span>
                </div>
                <Progress value={completionPercentage} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {completionPercentage === 100 
                    ? '✨ Profile complete!' 
                    : 'Complete your profile to stand out'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Basic Information
          </CardTitle>
          <CardDescription>Tell us about yourself</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="bio">Professional Summary</Label>
            <Textarea
              id="bio"
              placeholder="Brief overview of your professional background and career goals..."
              value={profile.bio}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              className="mt-1 min-h-[100px]"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="e.g., San Francisco, CA"
                value={profile.location}
                onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="yearsOfExperience">Years of Experience</Label>
              <Input
                id="yearsOfExperience"
                type="number"
                placeholder="e.g., 5"
                value={profile.yearsOfExperience}
                onChange={(e) => setProfile({ ...profile, yearsOfExperience: parseInt(e.target.value) || 0 })}
                className="mt-1"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="linkedinUrl">LinkedIn Profile</Label>
              <Input
                id="linkedinUrl"
                type="url"
                placeholder="https://linkedin.com/in/yourprofile"
                value={profile.linkedinUrl}
                onChange={(e) => setProfile({ ...profile, linkedinUrl: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="portfolioUrl">Portfolio Website</Label>
              <Input
                id="portfolioUrl"
                type="url"
                placeholder="https://yourportfolio.com"
                value={profile.portfolioUrl}
                onChange={(e) => setProfile({ ...profile, portfolioUrl: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resume Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Resume
          </CardTitle>
          <CardDescription>Upload your latest resume and let AI extract your details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {profile.resume ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">{profile.resume.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(profile.resume.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setProfile({ ...profile, resume: null })}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <Button
                onClick={handleParseResume}
                disabled={parsingResume}
                className="w-full"
                variant="outline"
              >
                {parsingResume ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Parsing Resume with AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Parse Resume with AI
                  </>
                )}
              </Button>
            </div>
          ) : profile.resumeUrl && profile.resumeFileName ? (
            <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-primary" />
                <div>
                  <p className="font-medium text-foreground">{profile.resumeFileName}</p>
                  <p className="text-sm text-muted-foreground">Saved resume</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = profile.resumeUrl;
                    link.download = profile.resumeFileName;
                    link.click();
                  }}
                >
                  Download
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setProfile({ ...profile, resumeUrl: '', resumeFileName: '' })}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors">
              <Upload className="w-10 h-10 text-muted-foreground mb-4" />
              <p className="text-sm font-medium text-foreground">Click to upload resume</p>
              <p className="text-xs text-muted-foreground mt-1">PDF, DOC, DOCX up to 10MB</p>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
          )}
        </CardContent>
      </Card>

      {/* Skills */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Skills
          </CardTitle>
          <CardDescription>Add your technical and soft skills</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            {profile.skills.map((skill, index) => (
              <Badge key={`skill-${index}-${skill}`} variant="secondary" className="px-3 py-1.5 text-sm">
                {skill}
                <button
                  onClick={() => removeSkill(skill)}
                  className="ml-2 hover:text-destructive"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Add a skill"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addSkill()}
            />
            <Button variant="outline" onClick={addSkill}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Experience */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary" />
            Work Experience
            {profile.experiences.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {profile.experiences.length} position{profile.experiences.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>Add your professional work experience</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Existing Experiences */}
          {profile.experiences.length > 0 && (
            <div className="space-y-3">
              {profile.experiences.map((exp, index) => (
                <div key={index} className="border border-border rounded-lg p-4 space-y-2 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-foreground">{exp.role}</h4>
                        {exp.current && (
                          <Badge variant="default" className="text-xs bg-green-500">Current</Badge>
                        )}
                      </div>
                      <p className="text-sm text-primary font-medium">{exp.company}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {exp.startDate ? new Date(exp.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'N/A'}
                          {' — '}
                          {exp.current ? 'Present' : (exp.endDate ? new Date(exp.endDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'N/A')}
                        </span>
                      </div>
                      {exp.description && (
                        <p className="text-sm text-muted-foreground mt-2">{exp.description}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setProfile({
                          ...profile,
                          experiences: profile.experiences.filter((_, i) => i !== index),
                        });
                      }}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Experience Form */}
          {showExperienceForm ? (
            <div className="border border-primary/20 rounded-lg p-4 space-y-4 bg-primary/5">
              <h4 className="font-medium text-foreground">Add New Experience</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="expCompany">Company *</Label>
                  <Input
                    id="expCompany"
                    placeholder="e.g., Google"
                    value={newExperience.company}
                    onChange={(e) => setNewExperience({ ...newExperience, company: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="expRole">Role/Position *</Label>
                  <Input
                    id="expRole"
                    placeholder="e.g., Senior Software Engineer"
                    value={newExperience.role}
                    onChange={(e) => setNewExperience({ ...newExperience, role: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="expStartDate">Start Date *</Label>
                  <Input
                    id="expStartDate"
                    type="date"
                    value={newExperience.startDate}
                    onChange={(e) => setNewExperience({ ...newExperience, startDate: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="expEndDate">End Date</Label>
                  <Input
                    id="expEndDate"
                    type="date"
                    value={newExperience.endDate}
                    onChange={(e) => setNewExperience({ ...newExperience, endDate: e.target.value })}
                    className="mt-1"
                    disabled={newExperience.current}
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="expCurrent"
                  checked={newExperience.current}
                  onChange={(e) => setNewExperience({ ...newExperience, current: e.target.checked, endDate: e.target.checked ? '' : newExperience.endDate })}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <Label htmlFor="expCurrent" className="text-sm font-normal cursor-pointer">
                  I currently work here
                </Label>
              </div>
              <div>
                <Label htmlFor="expDescription">Description</Label>
                <Textarea
                  id="expDescription"
                  placeholder="Describe your responsibilities and achievements..."
                  value={newExperience.description}
                  onChange={(e) => setNewExperience({ ...newExperience, description: e.target.value })}
                  className="mt-1"
                  rows={3}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowExperienceForm(false);
                    setNewExperience({ company: '', role: '', startDate: '', endDate: '', current: false, description: '' });
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (newExperience.company.trim() && newExperience.role.trim() && newExperience.startDate) {
                      setProfile({
                        ...profile,
                        experiences: [...profile.experiences, newExperience],
                      });
                      setNewExperience({ company: '', role: '', startDate: '', endDate: '', current: false, description: '' });
                      setShowExperienceForm(false);
                    }
                  }}
                  disabled={!newExperience.company.trim() || !newExperience.role.trim() || !newExperience.startDate}
                >
                  Add Experience
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" onClick={() => setShowExperienceForm(true)} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add Experience
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Education */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary" />
            Education
          </CardTitle>
          <CardDescription>Your educational background</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="E.g., B.S. Computer Science from MIT, 2018"
            value={profile.education}
            onChange={(e) => setProfile({ ...profile, education: e.target.value })}
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Projects */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FolderGit2 className="w-5 h-5 text-primary" />
            Projects
            {githubAnalysis?.repoCount && (
              <Badge variant="secondary" className="ml-2">
                {githubAnalysis.repoCount} GitHub Repos
              </Badge>
            )}
          </CardTitle>
          <CardDescription>Showcase your best projects with details about technologies used</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Existing Projects */}
          {profile.projects.length > 0 && (
            <div className="space-y-3">
              {profile.projects.map((project, index) => (
                <div key={index} className="border border-border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-foreground">{project.name}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setProfile({
                          ...profile,
                          projects: profile.projects.filter((_, i) => i !== index),
                        });
                      }}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  {project.techStack.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {project.techStack.map((tech, techIndex) => (
                        <Badge key={`project-${index}-tech-${techIndex}-${tech}`} variant="secondary" className="text-xs">
                          {tech}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-3 text-sm">
                    {project.githubUrl && (
                      <a
                        href={project.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        <Github className="w-3 h-3" />
                        Repository
                      </a>
                    )}
                    {project.liveUrl && (
                      <a
                        href={project.liveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Live Demo
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Project Form */}
          {showProjectForm ? (
            <div className="border border-primary/20 rounded-lg p-4 space-y-3 bg-primary/5">
              <h4 className="font-medium text-foreground">Add New Project</h4>
              <div>
                <Label htmlFor="projectName">Project Name *</Label>
                <Input
                  id="projectName"
                  placeholder="e.g., E-Commerce Platform"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="projectDesc">Description</Label>
                <Textarea
                  id="projectDesc"
                  placeholder="Brief description of what the project does..."
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  className="mt-1"
                  rows={2}
                />
              </div>
              <div>
                <Label>Tech Stack</Label>
                <div className="flex flex-wrap gap-1.5 mb-2 mt-1">
                  {newProject.techStack.map((tech, techIndex) => (
                    <Badge key={`newproject-tech-${techIndex}-${tech}`} variant="secondary" className="text-xs">
                      {tech}
                      <button
                        onClick={() =>
                          setNewProject({
                            ...newProject,
                            techStack: newProject.techStack.filter((t) => t !== tech),
                          })
                        }
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add technology"
                    value={newTech}
                    onChange={(e) => setNewTech(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newTech.trim()) {
                        e.preventDefault();
                        if (!newProject.techStack.includes(newTech.trim())) {
                          setNewProject({
                            ...newProject,
                            techStack: [...newProject.techStack, newTech.trim()],
                          });
                        }
                        setNewTech('');
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (newTech.trim() && !newProject.techStack.includes(newTech.trim())) {
                        setNewProject({
                          ...newProject,
                          techStack: [...newProject.techStack, newTech.trim()],
                        });
                        setNewTech('');
                      }
                    }}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="githubUrl">GitHub URL</Label>
                  <Input
                    id="githubUrl"
                    placeholder="https://github.com/..."
                    value={newProject.githubUrl}
                    onChange={(e) => setNewProject({ ...newProject, githubUrl: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="liveUrl">Live Demo URL</Label>
                  <Input
                    id="liveUrl"
                    placeholder="https://..."
                    value={newProject.liveUrl}
                    onChange={(e) => setNewProject({ ...newProject, liveUrl: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowProjectForm(false);
                    setNewProject({ name: '', description: '', techStack: [], githubUrl: '', liveUrl: '' });
                    setNewTech('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (newProject.name.trim()) {
                      setProfile({
                        ...profile,
                        projects: [...profile.projects, newProject],
                      });
                      setNewProject({ name: '', description: '', techStack: [], githubUrl: '', liveUrl: '' });
                      setNewTech('');
                      setShowProjectForm(false);
                    }
                  }}
                  disabled={!newProject.name.trim()}
                >
                  Add Project
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" onClick={() => setShowProjectForm(true)} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add Project
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Certifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            Certifications
          </CardTitle>
          <CardDescription>
            Add professional certifications to showcase your credentials
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {profile.certifications.length > 0 && (
            <div className="space-y-3">
              {profile.certifications.map((cert, index) => (
                <div
                  key={index}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{cert.name}</h4>
                        {cert.credentialUrl && (
                          <a
                            href={cert.credentialUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{cert.issuer}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        {cert.issueDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Issued: {new Date(cert.issueDate).toLocaleDateString()}
                          </span>
                        )}
                        {cert.expiryDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Expires: {new Date(cert.expiryDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      {cert.credentialId && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Credential ID: {cert.credentialId}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setProfile({
                          ...profile,
                          certifications: profile.certifications.filter((_, i) => i !== index),
                        });
                      }}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {showCertForm ? (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="certName">Certification Name *</Label>
                  <Input
                    id="certName"
                    placeholder="e.g., AWS Solutions Architect"
                    value={newCertification.name}
                    onChange={(e) => setNewCertification({ ...newCertification, name: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="certIssuer">Issuing Organization *</Label>
                  <Input
                    id="certIssuer"
                    placeholder="e.g., Amazon Web Services"
                    value={newCertification.issuer}
                    onChange={(e) => setNewCertification({ ...newCertification, issuer: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="certIssueDate">Issue Date</Label>
                  <Input
                    id="certIssueDate"
                    type="date"
                    value={newCertification.issueDate}
                    onChange={(e) => setNewCertification({ ...newCertification, issueDate: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="certExpiryDate">Expiry Date (if applicable)</Label>
                  <Input
                    id="certExpiryDate"
                    type="date"
                    value={newCertification.expiryDate}
                    onChange={(e) => setNewCertification({ ...newCertification, expiryDate: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="certCredentialId">Credential ID</Label>
                  <Input
                    id="certCredentialId"
                    placeholder="e.g., ABC123XYZ"
                    value={newCertification.credentialId}
                    onChange={(e) => setNewCertification({ ...newCertification, credentialId: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="certCredentialUrl">Credential URL</Label>
                  <Input
                    id="certCredentialUrl"
                    placeholder="https://..."
                    value={newCertification.credentialUrl}
                    onChange={(e) => setNewCertification({ ...newCertification, credentialUrl: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCertForm(false);
                    setNewCertification({ name: '', issuer: '', issueDate: '', expiryDate: '', credentialId: '', credentialUrl: '' });
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (newCertification.name.trim() && newCertification.issuer.trim()) {
                      setProfile({
                        ...profile,
                        certifications: [...profile.certifications, newCertification],
                      });
                      setNewCertification({ name: '', issuer: '', issueDate: '', expiryDate: '', credentialId: '', credentialUrl: '' });
                      setShowCertForm(false);
                    }
                  }}
                  disabled={!newCertification.name.trim() || !newCertification.issuer.trim()}
                >
                  Add Certification
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" onClick={() => setShowCertForm(true)} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add Certification
            </Button>
          )}
        </CardContent>
      </Card>

      {/* GitHub Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Github className="w-5 h-5 text-primary" />
            GitHub Profile Analysis
          </CardTitle>
          <CardDescription>
            Analyze your GitHub activity to showcase your technical skills
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="github">GitHub Username or Profile URL</Label>
              <Input
                id="github"
                placeholder="yourusername or https://github.com/yourusername"
                value={profile.githubUsername}
                onChange={(e) => setProfile({ ...profile, githubUsername: e.target.value })}
                className="mt-1"
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={handleAnalyzeGitHub}
                disabled={analyzingGitHub}
              >
                {analyzingGitHub ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  'Analyze'
                )}
              </Button>
            </div>
          </div>

          {githubAnalysis && (
            <div className="border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Overall Score</span>
                <Badge variant="default" className="text-lg px-3">
                  {githubAnalysis.overallScore}/100
                </Badge>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Activity Score</span>
                  <span className="font-medium">{githubAnalysis.activityScore}/100</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Public Repositories</span>
                  <span className="font-medium">{githubAnalysis.profileData?.publicRepos || githubAnalysis.totalRepositories || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Commits (30d)</span>
                  <span className="font-medium">{githubAnalysis.recentActivity?.commitCount || githubAnalysis.recentCommits || 0}</span>
                </div>
              </div>

              {githubAnalysis.topLanguages.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Top Languages</p>
                  <div className="flex flex-wrap gap-1.5">
                    {githubAnalysis.topLanguages.map((lang: any, langIndex: number) => (
                      <Badge key={`github-lang-${langIndex}-${lang.language}`} variant="secondary" className="text-xs">
                        {lang.language} ({lang.count})
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {githubAnalysis.insights.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Insights</p>
                  <ul className="space-y-1">
                    {githubAnalysis.insights.map((insight: string, idx: number) => (
                      <li key={idx} className="text-sm text-muted-foreground">
                        • {insight}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* LeetCode Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="w-5 h-5 text-orange-500" />
            LeetCode Profile
          </CardTitle>
          <CardDescription>
            Showcase your algorithmic problem-solving skills
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="leetcode">LeetCode Username or Profile URL</Label>
              <Input
                id="leetcode"
                placeholder="yourusername or https://leetcode.com/yourusername"
                value={profile.leetcodeUsername}
                onChange={(e) => setProfile({ ...profile, leetcodeUsername: e.target.value })}
                className="mt-1"
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={handleAnalyzeLeetCode}
                disabled={analyzingLeetCode}
              >
                {analyzingLeetCode ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  'Analyze'
                )}
              </Button>
            </div>
          </div>

          {leetcodeStats && (
            <div className="border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">LeetCode Score</span>
                <Badge variant="default" className="text-lg px-3 bg-orange-500">
                  {leetcodeStats.score}/100
                </Badge>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Solved</span>
                  <span className="font-medium">{leetcodeStats.totalSolved}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <p className="text-xs text-muted-foreground">Easy</p>
                    <p className="text-lg font-bold text-green-500">{leetcodeStats.easySolved}</p>
                  </div>
                  <div className="p-2 bg-yellow-500/10 rounded-lg">
                    <p className="text-xs text-muted-foreground">Medium</p>
                    <p className="text-lg font-bold text-yellow-500">{leetcodeStats.mediumSolved}</p>
                  </div>
                  <div className="p-2 bg-red-500/10 rounded-lg">
                    <p className="text-xs text-muted-foreground">Hard</p>
                    <p className="text-lg font-bold text-red-500">{leetcodeStats.hardSolved}</p>
                  </div>
                </div>
                {leetcodeStats.ranking && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Global Ranking</span>
                    <span className="font-medium">#{leetcodeStats.ranking.toLocaleString()}</span>
                  </div>
                )}
              </div>

              {leetcodeStats.insights?.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Insights</p>
                  <ul className="space-y-1">
                    {leetcodeStats.insights.map((insight: string, idx: number) => (
                      <li key={idx} className="text-sm text-muted-foreground">
                        • {insight}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preferred Roles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Preferred Roles
          </CardTitle>
          <CardDescription>What type of roles are you looking for?</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            {profile.preferredRoles.map((role, index) => (
              <Badge key={`role-${index}-${role}`} variant="default" className="px-3 py-1.5 text-sm">
                {role}
                <button
                  onClick={() => removeRole(role)}
                  className="ml-2 hover:text-primary-foreground/70"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Add preferred role"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addRole()}
            />
            <Button variant="outline" onClick={addRole}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button variant="gradient" size="lg" onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Profile
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default ApplicantProfile;
