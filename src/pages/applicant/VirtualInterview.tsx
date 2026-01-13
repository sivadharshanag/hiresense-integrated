import React, { useState, useEffect } from 'react';
import '@/styles/virtual-interview.css';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { 
  Mic, 
  MicOff, 
  Volume2,
  Clock,
  Trophy,
  Briefcase,
  AlertCircle,
  Play,
  MessageSquare,
  Video
} from 'lucide-react';
import { Scene } from '@/components/applicant/Scene';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { useWebcam } from '@/hooks/useWebcam';
import { aiService, type JobRole, type InterviewScore } from '@/services/aiService';
import type { GestureState } from '@/types/avatar';

const VirtualInterviewInterface: React.FC = () => {
  // State management
  const [interviewState, setInterviewState] = useState<'intro' | 'interviewing' | 'completed'>('intro');
  const [gestureState, setGestureState] = useState<GestureState>('idle');
  const [jobRole, setJobRole] = useState<JobRole>('software-engineer');
  const [conversationHistory, setConversationHistory] = useState<Array<{ speaker: 'ai' | 'user'; message: string }>>([]);
  const [currentResponse, setCurrentResponse] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [interviewScore, setInterviewScore] = useState<InterviewScore | null>(null);
  
  const { toast } = useToast();
  
  // Custom hooks
  const {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    error: speechError
  } = useSpeechRecognition();
  
  const { isSpeaking, speak, stop: stopSpeaking } = useTextToSpeech();
  const { 
    videoRef, 
    isEnabled: isCameraEnabled, 
    toggleCamera,
    error: cameraError 
  } = useWebcam();

  // Update gesture state based on speech/listening
  useEffect(() => {
    if (isSpeaking) {
      setGestureState('speaking');
    } else if (isListening) {
      setGestureState('listening');
    } else {
      setGestureState('idle');
    }
  }, [isSpeaking, isListening]);

  // Update current response with transcript
  useEffect(() => {
    setCurrentResponse(transcript + interimTranscript);
  }, [transcript, interimTranscript]);

  // Start interview
  const startInterview = async () => {
    try {
      aiService.setJobRole(jobRole);
      const greeting = aiService.getGreeting();
      
      setInterviewState('interviewing');
      setConversationHistory([{ speaker: 'ai', message: greeting }]);
      
      // Speak the greeting
      speak(greeting);
      
      toast({
        title: 'Interview Started!',
        description: 'The AI interviewer will begin shortly.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to start interview. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Submit response to AI
  const submitResponse = async () => {
    if (!transcript.trim()) return;

    const userMessage = transcript.trim();
    setIsProcessing(true);
    stopListening();
    
    try {
      // Add user message to history
      setConversationHistory(prev => [...prev, { speaker: 'user', message: userMessage }]);
      
      // Get AI response
      const aiResponse = await aiService.getResponse(userMessage);
      
      // Add AI response to history
      setConversationHistory(prev => [...prev, { speaker: 'ai', message: aiResponse }]);
      
      // Check if this contains an evaluation
      const score = aiService.parseEvaluation(aiResponse);
      if (score) {
        setInterviewScore(score);
        setInterviewState('completed');
      }
      
      // Speak the response
      speak(aiResponse);
      
    } catch (error) {
      console.error('Failed to get AI response:', error);
      toast({
        title: 'Error',
        description: 'Failed to process your response. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
      setCurrentResponse('');
    }
  };

  // Request final evaluation
  const requestEvaluation = async () => {
    setIsProcessing(true);
    
    try {
      const evaluation = await aiService.requestEvaluation();
      setConversationHistory(prev => [...prev, { speaker: 'ai', message: evaluation }]);
      
      const score = aiService.parseEvaluation(evaluation);
      if (score) {
        setInterviewScore(score);
        setInterviewState('completed');
      }
      
      speak(evaluation);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to get evaluation. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset interview
  const resetInterview = () => {
    setInterviewState('intro');
    setConversationHistory([]);
    setCurrentResponse('');
    setInterviewScore(null);
    aiService.resetConversation();
    stopSpeaking();
    stopListening();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 p-4">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 mb-4 shadow-lg">
            <Video className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-2">
            Virtual AI Interview
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Practice your interview skills with Sarah, our AI-powered HR interviewer powered by advanced conversational AI.
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Avatar Section */}
          <div className="space-y-6">
            <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center">
                    <Video className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">AI Interviewer - Sarah</CardTitle>
                    <CardDescription className="text-sm">
                      Professional HR specialist ready to conduct your interview
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="relative h-[32rem] w-full rounded-b-lg overflow-hidden bg-gradient-to-b from-gray-100 to-gray-200">
                  <Scene gestureState={gestureState} />
                  {/* Overlay for better visual hierarchy */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent pointer-events-none" />
                </div>
              </CardContent>
            </Card>

            {/* Enhanced Controls */}
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  Interview Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">{interviewState === 'intro' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <Briefcase className="w-4 h-4" />
                        Select Your Target Role
                      </label>
                      <select 
                        value={jobRole} 
                        onChange={(e) => setJobRole(e.target.value as JobRole)}
                        className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200 bg-white"
                      >
                        {aiService.getAvailableRoles().map(role => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <Button 
                      onClick={startInterview} 
                      className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-12"
                      size="lg"
                    >
                      <Play className="w-5 h-5 mr-2" />
                      Begin Interview Session
                    </Button>
                  </div>
                )}

                {interviewState === 'interviewing' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-3">
                      <Button 
                        onClick={isListening ? stopListening : startListening}
                        variant={isListening ? "destructive" : "default"}
                        disabled={isSpeaking || isProcessing}
                        className={`h-12 transition-all duration-300 ${
                          isListening 
                            ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                            : 'bg-blue-500 hover:bg-blue-600 text-white'
                        }`}
                      >
                        {isListening ? (
                          <>
                            <MicOff className="w-5 h-5 mr-2" />
                            <span className="flex items-center gap-2">
                              Recording... <span className="w-2 h-2 bg-white rounded-full animate-bounce"></span>
                            </span>
                          </>
                        ) : (
                          <>
                            <Mic className="w-5 h-5 mr-2" />
                            Start Speaking
                          </>
                        )}
                      </Button>
                      
                      <Button 
                        onClick={submitResponse}
                        disabled={!transcript.trim() || isProcessing || isSpeaking}
                        className="h-12 bg-green-500 hover:bg-green-600 text-white transition-all duration-300"
                      >
                        <MessageSquare className="w-5 h-5 mr-2" />
                        Submit Response
                      </Button>
                    </div>
                    
                    <Button 
                      onClick={requestEvaluation}
                      variant="outline"
                      disabled={isProcessing}
                      className="w-full h-12 border-2 border-yellow-400 text-yellow-700 hover:bg-yellow-50 transition-all duration-300"
                    >
                      <Trophy className="w-5 h-5 mr-2" />
                      Request Performance Evaluation
                    </Button>
                  </div>
                )}

                {interviewState === 'completed' && (
                  <Button 
                    onClick={resetInterview} 
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white border-0 shadow-lg h-12"
                    size="lg"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    Start New Interview
                  </Button>
                )}

                {/* Enhanced Camera Toggle */}
                <div className="pt-4 border-t border-gray-200">
                  <Button 
                    onClick={toggleCamera}
                    variant="outline"
                    className="w-full h-10 border-2 hover:bg-gray-50 transition-all duration-300"
                  >
                    <Video className="w-4 h-4 mr-2" />
                    {isCameraEnabled ? 'Turn Off Camera' : 'Turn On Camera'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Chat & Status Section */}
          <div className="space-y-6">
            {/* Your Camera */}
            {isCameraEnabled && (
              <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    Your Camera Feed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative rounded-xl overflow-hidden">
                    <video 
                      ref={videoRef}
                      className="w-full h-48 object-cover bg-gradient-to-b from-gray-800 to-gray-900"
                      autoPlay
                      muted
                      playsInline
                    />
                    <div className="absolute top-2 left-2">
                      <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                        LIVE
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Enhanced Current Response */}
            {(transcript || interimTranscript) && (
              <Card className="border-0 shadow-xl bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-blue-800">Your Response</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-white/70 rounded-lg p-4">
                    <p className="text-sm leading-relaxed">
                      <span className="text-gray-800 font-medium">{transcript}</span>
                      <span className="text-gray-500 italic">{interimTranscript}</span>
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Enhanced Interview Score */}
            {interviewScore && (
              <Card className="border-0 shadow-xl bg-gradient-to-r from-emerald-50 to-teal-50">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl text-emerald-800 flex items-center gap-2">
                    <Trophy className="w-6 h-6 text-yellow-500" />
                    Interview Results
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/70 rounded-xl p-4 text-center">
                      <p className="text-sm text-gray-600 font-medium">Communication</p>
                      <p className="text-3xl font-bold text-blue-600">{interviewScore.communication}<span className="text-lg text-gray-400">/10</span></p>
                    </div>
                    <div className="bg-white/70 rounded-xl p-4 text-center">
                      <p className="text-sm text-gray-600 font-medium">Tone</p>
                      <p className="text-3xl font-bold text-purple-600">{interviewScore.tone}<span className="text-lg text-gray-400">/10</span></p>
                    </div>
                    <div className="bg-white/70 rounded-xl p-4 text-center">
                      <p className="text-sm text-gray-600 font-medium">Content</p>
                      <p className="text-3xl font-bold text-green-600">{interviewScore.content}<span className="text-lg text-gray-400">/10</span></p>
                    </div>
                    <div className="bg-white/70 rounded-xl p-4 text-center">
                      <p className="text-sm text-gray-600 font-medium">Overall</p>
                      <p className="text-3xl font-bold text-indigo-600">{interviewScore.overall}<span className="text-lg text-gray-400">/10</span></p>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <Badge 
                      variant={
                        interviewScore.verdict === 'ACCEPT' ? 'default' : 
                        interviewScore.verdict === 'MAYBE' ? 'secondary' : 'destructive'
                      }
                      className={`text-lg px-6 py-3 rounded-full font-semibold ${
                        interviewScore.verdict === 'ACCEPT' 
                          ? 'bg-green-500 hover:bg-green-600 text-white' 
                          : interviewScore.verdict === 'MAYBE'
                          ? 'bg-yellow-400 hover:bg-yellow-500 text-gray-800'
                          : 'bg-red-500 hover:bg-red-600 text-white'
                      }`}
                    >
                      {interviewScore.verdict === 'ACCEPT' ? '✅ RECOMMENDED' : 
                       interviewScore.verdict === 'MAYBE' ? '🤔 NEEDS IMPROVEMENT' : 
                       '❌ NOT RECOMMENDED'}
                    </Badge>
                  </div>
                  
                  <div className="bg-white/70 rounded-xl p-4">
                    <p className="font-semibold mb-3 text-gray-800 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Detailed Feedback:
                    </p>
                    <p className="text-sm text-gray-700 leading-relaxed">{interviewScore.feedback}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Enhanced Conversation History */}
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-blue-500" />
                  Interview Conversation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                  {conversationHistory.map((message, index) => (
                    <div 
                      key={index} 
                      className={`group transition-all duration-300 hover:transform hover:scale-[1.02] ${
                        message.speaker === 'ai' 
                          ? 'flex justify-start' 
                          : 'flex justify-end'
                      }`}
                    >
                      <div className={`max-w-[80%] p-4 rounded-2xl shadow-md ${
                        message.speaker === 'ai' 
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-tl-none' 
                          : 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-tr-none'
                      }`}>
                        <p className="text-xs font-semibold mb-2 opacity-80">
                          {message.speaker === 'ai' ? '🤖 Sarah (AI Interviewer)' : '👤 You'}
                        </p>
                        <p className="text-sm leading-relaxed">{message.message}</p>
                      </div>
                    </div>
                  ))}
                  
                  {isProcessing && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 rounded-2xl rounded-tl-none p-4 max-w-[80%] border border-gray-200">
                        <p className="text-xs font-semibold mb-2 text-blue-600">🤖 Sarah is thinking...</p>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Enhanced Error Messages */}
            {(speechError || cameraError) && (
              <Card className="border-0 shadow-xl bg-red-50 border-l-4 border-red-500">
                <CardHeader className="pb-3">
                  <CardTitle className="text-red-800 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    System Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {speechError && (
                      <div className="bg-red-100 rounded-lg p-3">
                        <p className="text-sm text-red-700">
                          <strong>Speech Recognition:</strong> {speechError}
                        </p>
                      </div>
                    )}
                    {cameraError && (
                      <div className="bg-red-100 rounded-lg p-3">
                        <p className="text-sm text-red-700">
                          <strong>Camera Access:</strong> {cameraError}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VirtualInterviewInterface;
