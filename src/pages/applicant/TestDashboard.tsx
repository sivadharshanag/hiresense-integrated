/**
 * Test Dashboard Component
 * Minimal version to test if buttons and routing work
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Video, Briefcase } from 'lucide-react';

const TestDashboard: React.FC = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Test Dashboard</h1>
      
      {/* Test Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Navigation Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Link to="/applicant/virtual-interview">
              <Button className="bg-purple-600 text-white hover:bg-purple-700">
                <Video className="w-4 h-4 mr-2" />
                AI Interview (Test)
              </Button>
            </Link>
            
            <Link to="/applicant/jobs">
              <Button variant="outline">
                <Briefcase className="w-4 h-4 mr-2" />
                Browse Jobs
              </Button>
            </Link>
          </div>
          
          <p>If you can see these buttons, the routing should work.</p>
        </CardContent>
      </Card>
      
      {/* Large Prominent Button */}
      <Card className="border-purple-200">
        <CardContent className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-4 text-purple-600">🎯 AI Virtual Interview</h2>
          <p className="mb-6 text-gray-600">Click the button below to test the virtual interview</p>
          <Link to="/applicant/virtual-interview">
            <Button size="lg" className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:from-purple-600 hover:to-indigo-700 text-lg px-8 py-4">
              <Video className="w-5 h-5 mr-3" />
              Start AI Interview
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};

export default TestDashboard;
