import React, { useState, useEffect } from 'react';
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

// Extend Window for Speech APIs
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

// Speech Recognition Hook
const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.error('Speech recognition not supported');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    
    const recognition = recognitionRef.current;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      setTranscript(interimTranscript);
      if (finalText) {
        setFinalTranscript(prev => prev + finalText);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    return () => {
      if (recognition) {
        recognition.stop();
      }
    };
  }, []);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setTranscript('');
      setFinalTranscript('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  return {
    isListening,
    transcript,
    finalTranscript,
    startListening,
    stopListening,
    resetTranscript: () => {
      setTranscript('');
      setFinalTranscript('');
    }
  };
};

// Text-to-Speech Hook
const useTextToSpeech = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speak = (text: string, rate: number = 1.0) => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Try to get a female voice
    const voices = window.speechSynthesis.getVoices();
    const femaleVoice = voices.find(voice => 
      voice.name.includes('Female') || 
      voice.name.includes('Samantha') ||
      voice.name.includes('Google US English')
    );
    
    if (femaleVoice) {
      utterance.voice = femaleVoice;
    }
    
    utterance.rate = rate;
    utterance.pitch = 1.1;
    utterance.volume = 1;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const stop = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  return { speak, stop, isSpeaking };
};

// Main Component
const VirtualInterviewInterface: React.FC = () => {
  const [interviewState, setInterviewState] = useState<{
    status: 'intro' | 'ready' | 'question' | 'listening' | 'processing' | 'completed';
    currentQuestion: any;
    questionIndex: number;
    totalQuestions: number;
    progress: number;
  }>({
    status: 'intro',
    currentQuestion: null,
    questionIndex: 0,
    totalQuestions: 5,
    progress: 0
  });

  const [timeLeft, setTimeLeft] = useState(0);
  const [currentResponse, setCurrentResponse] = useState('');
  const [scores, setScores] = useState<any[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const { toast } = useToast();
  const { 
    isListening, 
    transcript, 
    finalTranscript, 
    startListening, 
    stopListening,
    resetTranscript 
  } = useSpeechRecognition();
  
  const { speak, isSpeaking } = useTextToSpeech();

  // Sample interview questions
  const mockQuestions = [
    {
      questionId: '1',
      category: 'behavioral',
      difficulty: 'medium',
      question: 'Tell me about a challenging project you worked on and how you overcame the difficulties.',
      timeLimit: 180
    },
    {
      questionId: '2',
      category: 'technical',
      difficulty: 'medium',
      question: 'What programming languages and frameworks are you most comfortable with, and can you describe a project where you used them?',
      timeLimit: 120
    },
    {
      questionId: '3',
      category: 'situational',
      difficulty: 'medium',
      question: 'How would you handle a situation where you need to learn a new technology quickly for an urgent project?',
      timeLimit: 150
    },
    {
      questionId: '4',
      category: 'behavioral',
      difficulty: 'hard',
      question: 'Describe a time when you had to work with a difficult team member. How did you handle the situation?',
      timeLimit: 180
    },
    {
      questionId: '5',
      category: 'technical',
      difficulty: 'hard',
      question: 'Can you walk me through how you would debug a complex issue in production that affects users?',
      timeLimit: 200
    }
  ];

  useEffect(() => {
    setCurrentResponse(finalTranscript + transcript);
  }, [finalTranscript, transcript]);

  const startInterview = () => {
    setInterviewState(prev => ({ ...prev, status: 'ready' }));
    setTimeout(() => {
      speak("Hello! I'm Sarah, your AI interviewer. I'll be asking you a series of questions to assess your skills and experience. Take your time with each answer, and feel free to provide specific examples. Let's begin!");
      setTimeout(getNextQuestion, 8000);
    }, 1000);
  };

  const getNextQuestion = () => {
    const currentQ = mockQuestions[interviewState.questionIndex];
    
    if (!currentQ) {
      completeInterview();
      return;
    }
    
    setInterviewState(prev => ({
      ...prev,
      status: 'question',
      currentQuestion: currentQ,
      progress: ((prev.questionIndex + 1) / mockQuestions.length) * 100
    }));

    setTimeLeft(currentQ.timeLimit);
    
    setTimeout(() => {
      speak(`Question ${interviewState.questionIndex + 1}. ${currentQ.question}`);
    }, 1000);
  };

  const startAnswering = () => {
    setInterviewState(prev => ({ ...prev, status: 'listening' }));
    resetTranscript();
    startListening();
    startTimer();
  };

  const stopAnswering = () => {
    stopListening();
    stopTimer();
    setInterviewState(prev => ({ ...prev, status: 'processing' }));
    
    // Simulate AI scoring
    setTimeout(() => {
      const mockScore = Math.floor(Math.random() * 20) + 75; // 75-95
      
      setScores(prev => [...prev, {
        questionIndex: interviewState.questionIndex,
        score: mockScore,
        response: finalTranscript || currentResponse
      }]);

      toast({
        title: "Response Analyzed",
        description: `Score: ${mockScore}% - Good answer!`,
      });

      if (interviewState.questionIndex < mockQuestions.length - 1) {
        setInterviewState(prev => ({ 
          ...prev, 
          questionIndex: prev.questionIndex + 1
        }));
        setTimeout(() => {
          speak("Thank you for your answer. Let's move on to the next question.");
          setTimeout(getNextQuestion, 3000);
        }, 2000);
      } else {
        setTimeout(completeInterview, 2000);
      }
    }, 2000);
  };

  const completeInterview = () => {
    const avgScore = scores.reduce((acc, s) => acc + s.score, 0) / scores.length || 85;
    
    setInterviewState(prev => ({ ...prev, status: 'completed' }));
    
    setTimeout(() => {
      speak(`Congratulations! You have completed the virtual interview. Your overall performance score is ${Math.round(avgScore)} percent. The hiring team will review your responses and get back to you soon. Thank you for your time!`);
    }, 1000);
  };

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          stopAnswering();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">AI Virtual Interview</CardTitle>
                <CardDescription>
                  {interviewState.status === 'intro' && 'Ready to start your interview?'}
                  {interviewState.status !== 'intro' && interviewState.status !== 'completed' && 
                    `Question ${interviewState.questionIndex + 1} of ${interviewState.totalQuestions}`
                  }
                  {interviewState.status === 'completed' && 'Interview Complete'}
                </CardDescription>
              </div>
              {interviewState.status !== 'intro' && interviewState.status !== 'completed' && (
                <div className="flex items-center space-x-4">
                  <Badge variant="outline" className="text-lg px-3 py-1">
                    <Clock size={16} className="mr-1" />
                    {formatTime(timeLeft)}
                  </Badge>
                </div>
              )}
            </div>
            {interviewState.status !== 'intro' && interviewState.status !== 'completed' && (
              <Progress value={interviewState.progress} className="mt-2" />
            )}
          </CardHeader>
        </Card>

        {/* Main Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Avatar Section */}
          <Card className="overflow-hidden">
            <CardContent className="p-0 h-[500px] relative bg-gradient-to-br from-slate-900 to-slate-800">
              <Avatar3D 
                isSpeaking={isSpeaking}
                isListening={isListening}
              />
              
              {/* Status Badge Overlay */}
              <div className="absolute bottom-4 left-4 right-4">
                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-sm">Sarah - AI Interviewer</h3>
                        <p className="text-xs text-gray-600">Professional Interviewer</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {isSpeaking && (
                          <Badge variant="default" className="animate-pulse">
                            <Volume2 size={14} className="mr-1" />
                            Speaking
                          </Badge>
                        )}
                        {isListening && (
                          <Badge variant="secondary" className="animate-pulse">
                            <Mic size={14} className="mr-1" />
                            Listening
                          </Badge>
                        )}
                        {!isSpeaking && !isListening && interviewState.status !== 'intro' && (
                          <Badge variant="outline">
                            <MessageSquare size={14} className="mr-1" />
                            Waiting
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          {/* Question & Response Section */}
          <Card>
            <CardHeader>
              {interviewState.status !== 'intro' && interviewState.status !== 'completed' && (
                <CardTitle className="flex items-center">
                  <Trophy size={20} className="mr-2" />
                  {interviewState.currentQuestion?.category?.toUpperCase()} Question
                </CardTitle>
              )}
              {interviewState.status === 'intro' && (
                <CardTitle>Welcome to Your Virtual Interview</CardTitle>
              )}
              {interviewState.status === 'completed' && (
                <CardTitle className="flex items-center text-green-600">
                  <Trophy size={20} className="mr-2" />
                  Interview Complete!
                </CardTitle>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Introduction */}
              {interviewState.status === 'intro' && (
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-2">About This Interview</h3>
                    <p className="text-sm text-gray-700 mb-3">
                      This is an AI-powered virtual interview that will assess your technical skills, 
                      problem-solving abilities, and communication style. The AI interviewer will ask 
                      you a series of questions and analyze your responses in real-time.
                    </p>
                    <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                      <li>Total Questions: {mockQuestions.length}</li>
                      <li>Estimated Duration: 15-20 minutes</li>
                      <li>Make sure your microphone is enabled</li>
                      <li>Speak clearly and provide specific examples</li>
                    </ul>
                  </div>
                  
                  <Button 
                    onClick={startInterview}
                    className="w-full"
                    size="lg"
                  >
                    <Play size={20} className="mr-2" />
                    Start Interview
                  </Button>
                </div>
              )}

              {/* Current Question */}
              {interviewState.status !== 'intro' && interviewState.status !== 'completed' && (
                <>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-lg font-medium mb-2">
                      {interviewState.currentQuestion?.question}
                    </p>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Badge variant="secondary">
                        {interviewState.currentQuestion?.difficulty}
                      </Badge>
                      <span>Time limit: {formatTime(interviewState.currentQuestion?.timeLimit || 180)}</span>
                    </div>
                  </div>

                  {/* Response Area */}
                  <div className="space-y-3">
                    <h4 className="font-semibold">Your Response:</h4>
                    <div className="bg-gray-50 p-4 rounded-lg min-h-32 max-h-48 overflow-y-auto">
                      {currentResponse ? (
                        <p className="text-gray-800">{currentResponse}</p>
                      ) : (
                        <p className="text-gray-500 italic">
                          {interviewState.status === 'listening' 
                            ? "🎤 Listening... Start speaking your answer" 
                            : interviewState.status === 'processing'
                            ? "⏳ Processing your response..."
                            : "Click 'Start Answering' to begin recording your response"
                          }
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex space-x-3">
                    {interviewState.status === 'question' && (
                      <Button 
                        onClick={startAnswering}
                        className="flex-1"
                        disabled={isSpeaking}
                      >
                        <Mic size={16} className="mr-2" />
                        Start Answering
                      </Button>
                    )}
                    
                    {interviewState.status === 'listening' && (
                      <Button 
                        onClick={stopAnswering}
                        variant="destructive"
                        className="flex-1"
                      >
                        <MicOff size={16} className="mr-2" />
                        Submit Answer
                      </Button>
                    )}
                    
                    {interviewState.status === 'processing' && (
                      <Button disabled className="flex-1">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Analyzing...
                      </Button>
                    )}
                  </div>

                  {/* Tips */}
                  <div className="bg-yellow-50 p-3 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <AlertCircle size={16} className="text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <p className="font-semibold text-yellow-800">Interview Tips:</p>
                        <ul className="text-yellow-700 mt-1 space-y-1 list-disc list-inside">
                          <li>Speak clearly and at a moderate pace</li>
                          <li>Use the STAR method for behavioral questions</li>
                          <li>Provide specific examples from your experience</li>
                          <li>Think before you speak - quality over speed</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Completion Summary */}
              {interviewState.status === 'completed' && (
                <div className="space-y-4">
                  <div className="bg-green-50 p-6 rounded-lg text-center">
                    <Trophy size={48} className="mx-auto text-green-600 mb-3" />
                    <h3 className="text-xl font-bold mb-2">Excellent Work!</h3>
                    <p className="text-gray-700 mb-4">
                      You've successfully completed all {mockQuestions.length} interview questions.
                    </p>
                    <div className="bg-white p-4 rounded-lg">
                      <h4 className="font-semibold mb-3">Your Performance Summary:</h4>
                      <div className="space-y-2">
                        {scores.map((score, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <span>Question {idx + 1}</span>
                            <Badge variant={score.score >= 85 ? "default" : "secondary"}>
                              {score.score}%
                            </Badge>
                          </div>
                        ))}
                        <div className="border-t pt-2 mt-2">
                          <div className="flex items-center justify-between font-semibold">
                            <span>Overall Score</span>
                            <Badge className="text-base">
                              {Math.round(scores.reduce((acc, s) => acc + s.score, 0) / scores.length || 0)}%
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 text-center">
                    The hiring team will review your interview and contact you within 3-5 business days.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default VirtualInterviewInterface;
