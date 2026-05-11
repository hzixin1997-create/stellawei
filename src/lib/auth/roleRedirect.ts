import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const ROUTE_MAP: Record<string, string> = {
  'qimenyihua@gmail.com': '/master/dashboard',
  'mshoucangjia@gmail.com': '/master/dashboard',
  'hzixin1997@gmail.com': '/admin/dashboard',
};

export function useRoleRedirect() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [targetRoute, setTargetRoute] = useState('/user/dashboard');

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user?.email) {
        const email = user.email.trim().toLowerCase();
        const route = ROUTE_MAP[email] || '/user/dashboard';
        setTargetRoute(route);
      }
      setIsLoading(false);
    };
    checkUser();
  }, [router]);

  return { isLoading, targetRoute };
}
