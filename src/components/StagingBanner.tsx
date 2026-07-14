'use client';

/**
 * Staging Environment Banner
 * 只在 Staging 环境显示，提示用户这是测试环境
 */
export default function StagingBanner() {
  const isStaging = process.env.NEXT_PUBLIC_ENV === 'staging';
  
  if (!isStaging) return null;

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-[9999] bg-yellow-500 text-black text-center py-2 px-4 text-sm font-bold"
      role="banner"
      aria-label="Staging environment warning"
    >
      ⚠️ STAGING ENVIRONMENT — 测试环境 | 
      <span className="ml-1 font-normal">
        此环境仅用于测试，所有数据为模拟数据，不会扣款
      </span>
    </div>
  );
}
