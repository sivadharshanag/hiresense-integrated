import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { recruiterApi } from '@/lib/api';
import { Building2, Briefcase, Users, AlertCircle, CheckCircle2, Loader2, Save, Mail, Shield } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { VerificationBadge } from '@/components/ui/verification-badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

const RecruiterProfile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [profile, setProfile] = useState({
    companyName: '',
    jobTitle: '',
    department: '',
    companyDescription: '',
    companyWebsite: '',
    companyLocation: '',
    companyEmail: '',
    emailVerified: false,
    trustLevel: 'low' as 'low' | 'medium' | 'verified',
  });

  const [stats, setStats] = useState({
    totalJobs: 0,
    totalApplicants: 0,
    selectedCount: 0,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingVerification, setSendingVerification] = useState(false);

  // Fetch profile and stats on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [profileRes, dashboardRes] = await Promise.all([
          recruiterApi.getProfile(),
          recruiterApi.getDashboard(),
        ]);

        if (profileRes.data?.profile) {
          const p = profileRes.data.profile;
          setProfile({
            companyName: p.companyName || '',
            jobTitle: p.jobTitle || '',
            department: p.department || '',
            companyDescription: p.companyDescription || '',
            companyWebsite: p.companyWebsite || '',
            companyLocation: p.companyLocation || '',
            companyEmail: p.companyEmail || '',
            emailVerified: p.emailVerified || false,
            trustLevel: p.trustLevel || 'low',
          });
        }

        if (dashboardRes.data?.stats) {
          setStats({
            totalJobs: dashboardRes.data.stats.totalJobs || 0,
            totalApplicants: dashboardRes.data.stats.totalApplicants || 0,
            selectedCount: dashboardRes.data.stats.selectedCount || 0,
          });
        }
      } catch (error: any) {
        console.log('Error loading profile:', error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const completionPercentage = Math.min(100, Math.round(
    ([profile.companyName, profile.jobTitle, profile.department, profile.companyDescription, 
      profile.companyWebsite, profile.companyLocation, profile.companyEmail].filter(Boolean).length / 7) * 100
  ));

  const handleSave = async () => {
    try {
      setSaving(true);
      await recruiterApi.updateProfile({
        companyName: profile.companyName,
        jobTitle: profile.jobTitle,
        department: profile.department,
        companyDescription: profile.companyDescription,
        companyWebsite: profile.companyWebsite,
        companyLocation: profile.companyLocation,
        companyEmail: profile.companyEmail,
      });

      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });
      
      // Reload profile to get updated trustLevel
      const profileRes = await recruiterApi.getProfile();
      if (profileRes.data?.profile) {
        const p = profileRes.data.profile;
        setProfile({
          companyName: p.companyName || '',
          jobTitle: p.jobTitle || '',
          department: p.department || '',
          companyDescription: p.companyDescription || '',
          companyWebsite: p.companyWebsite || '',
          companyLocation: p.companyLocation || '',
          companyEmail: p.companyEmail || '',
          emailVerified: p.emailVerified || false,
          trustLevel: p.trustLevel || 'low',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update profile',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSendVerification = async () => {
    if (!profile.companyEmail) {
      toast({
        title: 'Error',
        description: 'Please add a company email first and save your profile',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSendingVerification(true);
      
      // First save the profile to ensure companyEmail is stored
      await recruiterApi.updateProfile({
        companyEmail: profile.companyEmail,
      });
      
      const res = await recruiterApi.sendVerification();
      
      toast({
        title: 'Verification Email Sent! 📧',
        description: res.data?.message || `Check ${profile.companyEmail} for the verification link`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send verification email',
        variant: 'destructive',
      });
    } finally {
      setSendingVerification(false);
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Recruiter Profile</h1>
          <p className="text-muted-foreground mt-1">Manage your company information and verification status</p>
        </div>
        <VerificationBadge 
          trustLevel={profile.trustLevel} 
          emailVerified={profile.emailVerified} 
          size="lg"
        />
      </div>

      {/* 🔐 VERIFICATION ALERT */}
      {!profile.emailVerified && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <Shield className="h-5 w-5 text-yellow-600" />
          <AlertDescription className="ml-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="font-medium text-yellow-800">Verify your company email to become a Verified Employer</p>
                <p className="text-sm text-yellow-700 mt-1">
                  Verified employers get a trust badge on job postings and higher candidate interest.
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="border-yellow-300 text-yellow-700 hover:bg-yellow-100 shrink-0"
                onClick={handleSendVerification}
                disabled={!profile.companyEmail || sendingVerification}
              >
                {sendingVerification ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Verification Email
                  </>
                )}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Profile Completion Progress */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Profile Completion</span>
            <span className="text-sm text-muted-foreground">{completionPercentage}%</span>
          </div>
          <Progress value={completionPercentage} className="h-2" />
          {completionPercentage < 100 && (
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Complete your profile to attract top talent
            </p>
          )}
        </CardContent>
      </Card>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl gradient-primary flex items-center justify-center">
              <span className="text-2xl font-bold text-primary-foreground">
                {user?.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </span>
            </div>
            <div>
              <CardTitle className="text-xl">{user?.fullName}</CardTitle>
              <CardDescription>{user?.email}</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 🔐 VERIFICATION SECTION */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Company Verification
          </CardTitle>
          <CardDescription>Verify your company email to build trust with candidates</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="companyEmail">Company Email</Label>
            <div className="flex gap-2">
              <Input
                id="companyEmail"
                type="email"
                placeholder="you@company.com (avoid Gmail/Yahoo)"
                value={profile.companyEmail}
                onChange={(e) => setProfile({ ...profile, companyEmail: e.target.value })}
                className="flex-1"
              />
              {profile.emailVerified ? (
                <Button variant="outline" disabled className="border-green-500 text-green-600">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Verified
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  onClick={handleSendVerification}
                  disabled={!profile.companyEmail || sendingVerification}
                >
                  {sendingVerification ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Verify
                    </>
                  )}
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Use your official company email (e.g., @infosys.com, @tcs.com). 
              {profile.trustLevel === 'low' && ' Generic emails (Gmail/Yahoo) show lower trust.'}
            </p>
          </div>
          
          {/* Trust Level Indicator */}
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Current Trust Level</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {profile.trustLevel === 'verified' && '✅ Candidates see you as a trusted employer'}
                  {profile.trustLevel === 'medium' && '⏳ Verify email to unlock trusted status'}
                  {profile.trustLevel === 'low' && '❌ Add company email to increase trust'}
                </p>
              </div>
              <VerificationBadge 
                trustLevel={profile.trustLevel} 
                emailVerified={profile.emailVerified} 
                size="md"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Company Information
          </CardTitle>
          <CardDescription>Tell us about your organization</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company / GCC Name</Label>
              <Input
                id="companyName"
                placeholder="Acme Corporation"
                value={profile.companyName}
                onChange={(e) => setProfile({ ...profile, companyName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                placeholder="Engineering"
                value={profile.department}
                onChange={(e) => setProfile({ ...profile, department: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="jobTitle">Your Job Title</Label>
            <Input
              id="jobTitle"
              placeholder="Head of Talent Acquisition"
              value={profile.jobTitle}
              onChange={(e) => setProfile({ ...profile, jobTitle: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="companyDescription">Company Description</Label>
            <Textarea
              id="companyDescription"
              placeholder="Tell candidates about your company culture and mission..."
              value={profile.companyDescription}
              onChange={(e) => setProfile({ ...profile, companyDescription: e.target.value })}
              rows={4}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="companyWebsite">Company Website</Label>
              <Input
                id="companyWebsite"
                type="url"
                placeholder="https://www.company.com"
                value={profile.companyWebsite}
                onChange={(e) => setProfile({ ...profile, companyWebsite: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyLocation">Company Location</Label>
              <Input
                id="companyLocation"
                placeholder="San Francisco, CA"
                value={profile.companyLocation}
                onChange={(e) => setProfile({ ...profile, companyLocation: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.totalJobs}</p>
              <p className="text-sm text-muted-foreground">Jobs Posted</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-info/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-info" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.totalApplicants}</p>
              <p className="text-sm text-muted-foreground">Candidates Reviewed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.selectedCount}</p>
              <p className="text-sm text-muted-foreground">Candidates Selected</p>
            </div>
          </CardContent>
        </Card>
      </div>

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

export default RecruiterProfile;
