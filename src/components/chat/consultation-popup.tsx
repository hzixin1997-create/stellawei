"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, Clock, Maximize2, Minimize2 } from "lucide-react";
import { ChatWindow } from "@/components/chat/chat-window";

interface ConsultationChatPopupProps {
  isOpen: boolean;
  onClose: () => void;
  masterName: string;
  scheduledDuration: number; // minutes
}

export function ConsultationChatPopup({
  isOpen,
  onClose,
  masterName,
  scheduledDuration = 30,
}: ConsultationChatPopupProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(scheduledDuration * 60); // seconds

  useEffect(() => {
    if (!isOpen || isMinimized) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 0) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, isMinimized]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  if (!isOpen) return null;

  // Minimized state - floating button
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsMinimized(false)}
          className="bg-amber-600 hover:bg-amber-700 text-white shadow-lg rounded-full px-4 py-3 h-auto"
        >
          <Clock className="w-4 h-4 mr-2" />
          Consultation with {masterName}
          <Maximize2 className="w-4 h-4 ml-2" />
        </Button>
      </div>
    );
  }

  // Full chat window popup
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <Card className="flex flex-col w-full max-w-lg h-[80vh] max-h-[700px] bg-slate-900 border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Popup Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/95">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-amber-900 flex items-center justify-center text-xs font-medium text-amber-200">
                LN
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-slate-900 rounded-full" />
            </div>
            <div>
              <p className="font-medium text-slate-100 text-sm">{masterName}</p>
              <p className="text-xs text-green-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                Live Consultation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Time remaining */}
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-mono ${
              timeRemaining < 300 ? "bg-red-900/30 text-red-400" : "bg-slate-800 text-slate-300"
            }`}>
              <Clock className="w-3 h-3" />
              {formatTime(timeRemaining)}
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMinimized(true)}
              className="text-slate-400 hover:text-slate-100 h-8 w-8"
            >
              <Minimize2 className="w-4 h-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-slate-400 hover:text-red-400 h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Chat Content - Reuse existing ChatWindow but without its own header */}
        <div className="flex-1 overflow-hidden">
          <ChatWindowEmbedded />
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-slate-800 bg-slate-900/95 text-center">
          <p className="text-[10px] text-slate-600">
            This consultation is recorded for quality purposes. 
            {timeRemaining <= 0 && (
              <span className="text-amber-500 ml-1">Time is up - please conclude the session.</span>
            )}
          </p>
        </div>
      </Card>
    </div>
  );
}

// Embedded version of ChatWindow without header (for popup)
function ChatWindowEmbedded() {
  // Reuse the same state logic but without the outer Card shell
  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Messages would go here - simplified for demo */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div className="flex justify-center">
          <span className="text-xs text-slate-500 bg-slate-800/50 px-3 py-1 rounded-full">
            Consultation started
          </span>
        </div>
        <div className="flex justify-start">
          <div className="max-w-[80%]">
            <div className="px-3 py-2 rounded-2xl text-sm leading-relaxed bg-slate-800 text-slate-200 rounded-bl-md border border-slate-700">
              Hello! I'm ready for our consultation. Please feel free to share any additional thoughts or questions.
            </div>
            <div className="flex items-center gap-1 mt-1 text-[10px] justify-start text-slate-500">
              <span>10:00</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Demo page to show the popup
export function ChatPopupDemo() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 p-8">
      <div className="max-w-md mx-auto text-center space-y-6">
        <h1 className="text-2xl font-bold text-slate-100">Consultation Chat Demo</h1>
        <p className="text-slate-400">
          Click the button below to simulate the chat window popping up when your consultation time arrives.
        </p>

        <div className="p-6 bg-slate-800/50 rounded-lg border border-slate-700">
          <p className="text-sm text-slate-300 mb-4">
            Simulated scenario: Your appointment with Luna is scheduled for now.
          </p>
          <Button
            onClick={() => setIsOpen(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            Open Chat Window
          </Button>
        </div>

        <div className="space-y-2 text-xs text-slate-500">
          <p>Features demonstrated:</p>
          <ul className="space-y-1 text-left max-w-xs mx-auto">
            <li>• Popup modal with backdrop blur</li>
            <li>• Minimize to floating button</li>
            <li>• Countdown timer (turns red under 5 min)</li>
            <li>• Online status indicator</li>
            <li>• Dark theme matching Stellawei</li>
          </ul>
        </div>
      </div>

      <ConsultationChatPopup
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        masterName="Luna"
        scheduledDuration={30}
      />
    </div>
  );
}
