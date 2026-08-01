import CreditSection from '@/components/CreditSection';

export const metadata = {
  title: 'My Credit | StellaWei',
  description: 'Manage your StellaWei credit balance and referral rewards',
};

export default function CreditPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] to-[#12121a]">
      <div className="max-w-4xl mx-auto px-4 py-8 pt-24">
        <h1 className="text-2xl font-bold text-white mb-6">My Credit</h1>
        <CreditSection />
      </div>
    </div>
  );
}
