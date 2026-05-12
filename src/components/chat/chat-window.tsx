"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Send, Phone, Video, MoreVertical, ChevronDown } from "lucide-react";

interface Message {
  id: string;
  sender: "user" | "master";
  content: string;
  timestamp: string;
  status: "sent" | "delivered" | "read";
}

const DEMO_MESSAGES: Message[] = [
  {
    id: "1",
    sender: "master",
    content: "Hello! I'm Luna. I see you've booked a tarot consultation. When you're ready, please focus on a question you'd like guidance on.",
    timestamp: "10:02",
    status: "read",
  },
  {
    id: "2",
    sender: "user",
    content: "Hi Luna! I've been thinking about my career direction lately. Should I stay in my current role or look for something new?",
    timestamp: "10:03",
    status: "read",
  },
  {
    id: "3",
    sender: "master",
    content: "That's a wonderful question. Let me shuffle the cards and see what guidance the universe has for you today...",
    timestamp: "10:04",
    status: "read",
  },
  {
    id: "4",
    sender: "master",
    content: "The Three of Pentacles appears — this suggests collaboration and building skills. The cards indicate that growth comes through teamwork in your current environment, but new opportunities will present themselves in 3-4 months.",
    timestamp: "10:06",
    status: "read",
  },
];

// 简单头像组件（不依赖外部库）
function SimpleAvatar({ initials, color }: { initials: string; color: string }) {
  return (
    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${color}`}>
      {initials}
    </div>
  );
}

export function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>(DEMO_MESSAGES);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      sender: "user",
      content: inputValue.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      status: "sent",
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputValue("");

    // 模拟师傅回复
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const reply: Message = {
        id: (Date.now() + 1).toString(),
        sender: "master",
        content: "Thank you for sharing. The cards suggest you trust your intuition — there's a path opening that combines your current stability with new creative expression. Would you like me to pull one more card for clarity?",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        status: "read",
      };
      setMessages((prev) => [...prev, reply]);
    }, 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className="flex flex-col h-[600px] w-full max-w-md mx-auto bg-white border-stone-200 overflow-hidden shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200 bg-white/95 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="relative">
            <SimpleAvatar initials="LN" color="bg-amber-100 text-amber-700" />
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
          </div>
          <div>
            <p className="font-medium text-stone-800 text-sm">Luna · Tarot Master</p>
            <p className="text-xs text-green-600 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              Online
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="text-stone-500 hover:text-amber-600 hover:bg-stone-100 h-8 w-8">
            <Phone className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-stone-500 hover:text-amber-600 hover:bg-stone-100 h-8 w-8">
            <Video className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-stone-500 hover:text-amber-600 hover:bg-stone-100 h-8 w-8">
            <MoreVertical className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-stone-500 hover:text-amber-600 hover:bg-stone-100 h-8 w-8">
            <ChevronDown className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-stone-50">
        {/* Date separator */}
        <div className="flex justify-center">
          <span className="text-xs text-stone-500 bg-stone-200/50 px-3 py-1 rounded-full">
            Today
          </span>
        </div>

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            <div className={`max-w-[80%] ${msg.sender === "user" ? "order-1" : "order-2"}`}>
              <div
                className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                  msg.sender === "user"
                    ? "bg-amber-600 text-white rounded-br-md"
                    : "bg-white text-stone-700 rounded-bl-md border border-stone-200 shadow-sm"
                }`}
              >
                {msg.content}
              </div>
              <div
                className={`flex items-center gap-1 mt-1 text-[10px] ${
                  msg.sender === "user" ? "justify-end text-stone-400" : "justify-start text-stone-400"
                }`}
              >
                <span>{msg.timestamp}</span>
                {msg.sender === "user" && (
                  <span className="text-stone-400">
                    {msg.status === "read" ? "✓✓" : "✓"}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white border border-stone-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="px-4 py-3 border-t border-stone-200 bg-white/95">
        <div className="flex items-end gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="flex-1 bg-stone-100 border-stone-300 text-stone-800 placeholder:text-stone-400 focus-visible:ring-amber-500/50 rounded-xl min-h-[40px]"
          />
          <Button
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl h-10 px-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-[10px] text-stone-400 mt-1.5 text-center">
          Messages are encrypted and confidential. Consultation time: 28 minutes remaining.
        </p>
      </div>
    </Card>
  );
}
