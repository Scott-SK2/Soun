import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, MicOff, Volume2, VolumeX, MessageCircle, Settings } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTextToSpeech } from "@/hooks/use-text-to-speech";
import { VoiceSettingsDialog } from "@/components/voice/voice-settings-dialog";

interface VoiceAssistantProps {
  courseId?: string;
  courseName?: string;
}

export function VoiceAssistant({ courseId, courseName }: VoiceAssistantProps = {}) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [sessionId] = useState(() => `session-${Date.now()}`);
  const [shouldKeepListening, setShouldKeepListening] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<Array<{
    type: 'user' | 'assistant';
    message: string;
    timestamp: Date;
    courseContext?: string;
  }>>([]);

  const recognitionRef = useRef<any>(null);
  const autoStopTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldKeepListeningRef = useRef<boolean>(false);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fullTranscriptRef = useRef("");
  const { toast } = useToast();
  const textToSpeechHook = useTextToSpeech();
  const { speak, cancel, speaking } = textToSpeechHook;
  const [currentCheck, setCurrentCheck] = useState<string | null>(null);

  // Update speaking state when TTS speaking state changes
  useEffect(() => {
    if (speaking !== undefined) {
      setIsSpeaking(speaking);
    }
  }, [speaking]);

  // Stop listening when assistant starts speaking to avoid audio loop
  useEffect(() => {
    if (isSpeaking && isListening) {
      // Assistant is speaking, stop listening immediately
      setShouldKeepListening(false);
      shouldKeepListeningRef.current = false;

      if (autoStopTimeoutRef.current) {
        clearTimeout(autoStopTimeoutRef.current);
        autoStopTimeoutRef.current = null;
      }

      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore if already stopped
        }
      }
      setIsListening(false);
    }
  }, [isSpeaking, isListening]);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();

      if (recognitionRef.current) {
        recognitionRef.current.continuous = true; // Keep listening for 20 seconds
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event: any) => {
          let fullTranscript = "";
          
          for (let i = 0; i < event.results.length; i++) {
            fullTranscript += event.results[i][0].transcript + " ";
          }
          
          fullTranscript = fullTranscript.trim();
          
          setTranscript(fullTranscript);
          fullTranscriptRef.current = fullTranscript;
          
          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
          }
          
          silenceTimeoutRef.current = setTimeout(() => {
            const finalText = fullTranscriptRef.current.trim();
            
            if (finalText) {
              processCommand(finalText);
            }
            
            if (recognitionRef.current) {
              recognitionRef.current.stop();
            }
          }, 5000);
        };

        recognitionRef.current.onerror = (event: any) => {
          // Ignore no-speech error
          if (event.error === 'no-speech') {
            return;
          }
          setIsListening(false);
          setShouldKeepListening(false);
          shouldKeepListeningRef.current = false;
        };

        recognitionRef.current.onend = () => {
          // Don't restart if assistant is speaking (avoid audio loop)
          if (speaking) {
            setIsListening(false);
            setShouldKeepListening(false);
            shouldKeepListeningRef.current = false;
            if (autoStopTimeoutRef.current) {
              clearTimeout(autoStopTimeoutRef.current);
              autoStopTimeoutRef.current = null;
            }
            return;
          }

          // Auto-restart if still within 20 second window
          if (shouldKeepListeningRef.current && autoStopTimeoutRef.current) {
            setTimeout(() => {
              try {
                // Double-check assistant is not speaking before restarting
                if (shouldKeepListeningRef.current && !speaking) {
                  recognitionRef.current.start();
                }
              } catch (error) {
                setIsListening(false);
                setShouldKeepListening(false);
                shouldKeepListeningRef.current = false;
                if (autoStopTimeoutRef.current) {
                  clearTimeout(autoStopTimeoutRef.current);
                  autoStopTimeoutRef.current = null;
                }
              }
            }, 200);
            return;
          }

          // Normal end
          setIsListening(false);
          setShouldKeepListening(false);
          shouldKeepListeningRef.current = false;
        };
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore if already stopped
        }
      }
      if (autoStopTimeoutRef.current) {
        clearTimeout(autoStopTimeoutRef.current);
      }
      shouldKeepListeningRef.current = false;
    };
  }, []);


// Process voice commands using AI only
const processVoiceCommand = useMutation({
  mutationFn: async (command: string) => {
    const currentPath = window.location.pathname;
    const courseMatch = currentPath.match(/\/courses\/([^\/]+)/);
    const detectedCourseId = courseMatch ? courseMatch[1] : courseId;
    
    if (currentCheck) {
      const lower = command.toLowerCase();

      const isConfused =
      lower.includes("don't understand") ||
      lower.includes("confused") ||
      lower.includes("don't get it") ||
      lower.includes("not clear");
      
      const wantsExample = lower.includes("example");
      
      const wantsSimpler =
      lower.includes("simpler") ||
      lower.includes("simplify") ||
      lower.includes("simply") ||
      lower.includes("simple") ||
      lower.includes("easy") ||
      lower.includes("explain it more simply");
      
      const wantsRepeat =
      lower.includes("repeat") ||
      lower.includes("say that again");

      const isQuestion =
      lower.startsWith("what is") ||
      lower.startsWith("what are") ||
      lower.startsWith("why") ||
      lower.startsWith("how") ||
      lower.startsWith("can you explain") ||
      lower.includes("?")
      
      if (isConfused || wantsExample || wantsSimpler || wantsRepeat || isQuestion) {
        console.log("🧠 QUESTION/INTENT DETECTED", command);
        
        const response = await apiRequest("POST", "/api/tutor/ask", {
          question: command,
          courseId: detectedCourseId,
        });
        
        const data = await response.json();
        console.log("RETURNING ASK DATA", data);
        return data;
      }
      
      console.log("✅ GRADING STUDENT ANSWER", command);
      
      const response = await apiRequest("POST", "/api/tutor/grade", {
        check_question: currentCheck,
        student_answer: command,
      });
      
      const data = await response.json();
      console.log("RETURNING GRADE DATA", data);
      return data;
    }
    
    console.log("✅ ASKING PYTHON TUTOR", command);
    
    const response = await apiRequest("POST", "/api/tutor/ask", {
      question: command,
      courseId: detectedCourseId,
    });
    
    const data = await response.json();
    console.log("RETURNING ASK DATA", data);
    return data;
  },

  onSuccess: (data) => {
    if (!data) {
      console.error("No data returned from voice mutation");
      setResponse("I heard you, but I couldn't process the response.");
      return;
    }
    setResponse(data.message || data.response);
    setCurrentCheck(data.next_check || null);

    // Stop listening immediately when we get a response
    setShouldKeepListening(false);
    shouldKeepListeningRef.current = false;

    if (autoStopTimeoutRef.current) {
      clearTimeout(autoStopTimeoutRef.current);
      autoStopTimeoutRef.current = null;
    }

    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore if already stopped
      }
    }

    setIsListening(false);

    setConversationHistory(prev => [
      ...prev.slice(-4),
      {
        type: 'user',
        message: transcript,
        timestamp: new Date()
      },
      {
        type: 'assistant',
        message: data.message || data.response,
        timestamp: new Date(),
        courseContext: data.courseContext
      },
      
      ...(data.next_check ? [{
        type: 'assistant',
        message: data.next_check,
        timestamp: new Date(),
        isCheck: true,
      }] : [])
    ]);

    // Speak the response using voice settings
    const assistantMessage = data.message || data.response;

    if (assistantMessage) {
      // Cancel previous speech just in case
      speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(assistantMessage);
      
      utterance.onend = () => {
        if (data.next_check) {
          speak(data.next_check);
        }
      };
      
      speechSynthesis.speak(utterance);
    }
    if (data.next_check) {
      setCurrentCheck(data.next_check);
    } else {
      setCurrentCheck(null);
    }
  },

  onError: (error) => {
    console.error("Voice processing error:", error);

    const errorMessage =
      "I'm unable to process your request right now. Please check your connection and try again.";

    setResponse(errorMessage);

    toast({
      title: "Voice Processing Error",
      description: errorMessage,
      variant: "destructive"
    });
  }
});


  const processCommand = (command: string) => {
    if (command.trim()) {
      processVoiceCommand.mutate(command);
    }
  };

  const startListening = () => {
    // Don't start listening if assistant is speaking (avoid audio loop)
    if (isSpeaking) {
      toast({
        title: "Please Wait",
        description: "Let me finish speaking first!",
        variant: "default"
      });
      return;
    }

    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      setShouldKeepListening(true);
      shouldKeepListeningRef.current = true;
      setTranscript("");

      // Start recognition
      recognitionRef.current.start();

      // Set 20 second timeout
      if (autoStopTimeoutRef.current) {
        clearTimeout(autoStopTimeoutRef.current);
      }
      autoStopTimeoutRef.current = setTimeout(() => {
        setShouldKeepListening(false);
        shouldKeepListeningRef.current = false;
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
      }, 60000);

      toast({
        title: "🎤 Listening...",
        description: "Ask me about your course materials!",
        duration: 3000
      });
    } else {
      toast({
        title: "Speech Recognition Unavailable",
        description: "Your browser doesn't support speech recognition.",
        variant: "destructive"
      });
    }
  };

  const stopListening = () => {
    setShouldKeepListening(false);
    shouldKeepListeningRef.current = false;

    if (autoStopTimeoutRef.current) {
      clearTimeout(autoStopTimeoutRef.current);
      autoStopTimeoutRef.current = null;
    }

    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const stopSpeaking = () => {
    cancel();
    setIsSpeaking(false);
  };

  const clearConversation = () => {
    setConversationHistory([]);
    setResponse("");
    setTranscript("");
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-blue-600" />
            AI Study Assistant
            {courseName && (
              <span className="text-sm font-normal text-gray-600">
                ({courseName})
              </span>
            )}
          </div>
          <VoiceSettingsDialog />
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Conversation History */}
        <div className="max-h-40 overflow-y-auto space-y-2 p-2 bg-gray-50 rounded-lg">
          {conversationHistory.length === 0 ? (
            <div className="text-center text-gray-500 py-4">
              <MessageCircle className="h-6 w-6 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">Ask me about your course materials!</p>
            </div>
          ) : (
            conversationHistory.map((entry, index) => (
              <div
                key={index}
                className={`text-sm p-2 rounded ${
                  entry.type === 'user' 
                    ? 'bg-blue-100 text-blue-800 ml-4' 
                    : 'bg-green-100 text-green-800 mr-4'
                }`}
              >
                <strong>{entry.type === 'user' ? 'You:' : 'AI:'}</strong> {entry.message}
                {entry.courseContext && (
                  <div className="text-xs mt-1 opacity-75">
                    📚 {entry.courseContext}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Current interaction */}
        {isListening && (
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-red-600 font-medium mb-1">🎙️ Listening...</div>
            {transcript && (
              <div className="text-sm text-gray-600">"{transcript}"</div>
            )}
          </div>
        )}

        {processVoiceCommand.isPending && (
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-blue-600 font-medium">🤔 Processing your question...</div>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-between gap-2">
          <Button
            onClick={isListening ? stopListening : startListening}
            disabled={processVoiceCommand.isPending}
            className={`flex-1 ${
              isListening
                ? 'bg-red-600 hover:bg-red-700 animate-pulse'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isListening ? (
              <>
                <MicOff className="h-4 w-4 mr-2" />
                Stop
              </>
            ) : (
              <>
                <Mic className="h-4 w-4 mr-2" />
                {processVoiceCommand.isPending ? 'Processing...' : 'Ask Question'}
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={isSpeaking ? stopSpeaking : undefined}
            disabled={!isSpeaking}
          >
            {isSpeaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={clearConversation}
            title="Clear conversation"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}