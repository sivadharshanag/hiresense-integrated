// Test imports for virtual interview components
// This file is used to verify all imports work correctly

// Types
import type { 
  GestureState
} from './src/types/avatar';

// Hooks
import { useSpeechRecognition } from './src/hooks/useSpeechRecognition';
import { useTextToSpeech } from './src/hooks/useTextToSpeech';
import { useWebcam } from './src/hooks/useWebcam';

// Services
import { aiService } from './src/services/aiService';

// Components
import { Avatar } from './src/components/applicant/Avatar';
import { Scene } from './src/components/applicant/Scene';

// Main page
import VirtualInterview from './src/pages/applicant/VirtualInterview';

console.log('All imports successful - Virtual Interview integration complete!');

export {
  useSpeechRecognition,
  useTextToSpeech,
  useWebcam,
  aiService,
  Avatar,
  Scene,
  VirtualInterview
};
