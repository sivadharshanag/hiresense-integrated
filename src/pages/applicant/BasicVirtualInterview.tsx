/**
 * Basic Virtual Interview Page - Test Version
 * 
 * Simplified version to test navigation and routing
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Video, Mic, Play } from 'lucide-react';

const BasicVirtualInterview: React.FC = () => {
  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Virtual Interview</h1>
        <p className="text-muted-foreground">Practice your interview skills with our AI interviewer</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="w-5 h-5" />
              Interview Setup
            </CardTitle>
            <CardDescription>
              Configure your virtual interview experience
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Select Job Role:</label>
              <select className="w-full mt-1 p-2 border rounded-md">
                <option value="software-engineer">Software Engineer</option>
                <option value="product-manager">Product Manager</option>
                <option value="data-scientist">Data Scientist</option>
                <option value="ux-designer">UX/UI Designer</option>
              </select>
            </div>
            
            <Button className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:from-purple-600 hover:to-indigo-700">
              <Play className="w-4 h-4 mr-2" />
              Start Interview
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="w-5 h-5" />
              Interview Preview
            </CardTitle>
            <CardDescription>
              3D Avatar interview coming soon
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-100 rounded-lg p-8 text-center">
              <Video className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">Virtual Interview Interface</p>
              <p className="text-sm text-gray-500 mt-2">Click "Start Interview" to begin</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-blue-600 font-bold">1</span>
              </div>
              <h3 className="font-medium mb-2">Select Role</h3>
              <p className="text-sm text-muted-foreground">Choose the job position you want to practice for</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-green-600 font-bold">2</span>
              </div>
              <h3 className="font-medium mb-2">AI Interview</h3>
              <p className="text-sm text-muted-foreground">Interact with our 3D AI interviewer using voice</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-purple-600 font-bold">3</span>
              </div>
              <h3 className="font-medium mb-2">Get Feedback</h3>
              <p className="text-sm text-muted-foreground">Receive detailed performance analysis and tips</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BasicVirtualInterview;
