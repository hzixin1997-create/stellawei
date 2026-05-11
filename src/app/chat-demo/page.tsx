import { ChatWindow } from "@/components/chat/chat-window";

export default function ChatDemoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-slate-100 mb-2">Real-time Chat Demo</h1>
          <p className="text-sm text-slate-400">
            Technology: Daily.co (Video + Chat) or Supabase Realtime (Chat only)
          </p>
          <p className="text-xs text-amber-500 mt-1">
            Try typing a message to see the interactive prototype
          </p>
        </div>
        <ChatWindow />
      </div>
    </div>
  );
}
