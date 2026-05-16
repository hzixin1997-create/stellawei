export default function ChatDemoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <h1 className="text-2xl font-serif font-bold text-stone-800 mb-3">实时视频咨询</h1>
        <p className="text-stone-600 mb-2">该功能正在开发中，即将上线。</p>
        <p className="text-sm text-stone-500">上线后，您可以在预约时间与师傅进行高清视频通话。</p>
      </div>
    </div>
  );
}
