"use client";

import { createClient } from "@/lib/supabase/client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogIn, Eye, EyeOff } from "lucide-react";

export default function MasterLogin() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isZh, setIsZh] = useState(true);

  useEffect(() => {
    const lang = localStorage.getItem('language') || 'zh'
    setIsZh(lang === 'zh')
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      if (data.session) {
        // 验证是否为师傅账号
        const { data: master } = await supabase
          .from("masters")
          .select("id")
          .eq("user_id", data.user.id)
          .single();

        if (!master) {
          setError(isZh ? "此账号不是师傅账号" : "This account is not a master account");
          await supabase.auth.signOut();
          return;
        }

        router.push("/master/dashboard");
      }
    } catch (err: any) {
      setError(err.message || (isZh ? "登录失败" : "Login failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-stone-800">Stellawei</h1>
          <p className="text-stone-500 mt-1">{isZh ? '师傅登录' : 'Master Login'}</p>
        </div>

        {/* 登录表单 */}
        <div className="bg-white rounded-xl border border-stone-200 p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                {isZh ? '邮箱' : 'Email'}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={isZh ? '请输入邮箱' : 'Enter email'}
                required
                className="w-full px-4 py-2.5 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-stone-700"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                {isZh ? '密码' : 'Password'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isZh ? '请输入密码' : 'Enter password'}
                  required
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-stone-700 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-amber-700 text-white rounded-lg font-medium hover:bg-amber-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <LogIn size={18} />
              {loading ? (isZh ? "登录中..." : "Logging in...") : (isZh ? "登录" : "Log In")}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/" className="text-sm text-stone-500 hover:text-amber-700">
              ← {isZh ? '返回首页' : 'Back to Home'}
            </Link>
          </div>
        </div>

        {/* 占位提示 */}
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
          <p className="font-medium mb-1">{isZh ? '师傅账号说明' : 'Master Account Info'}</p>
          <p>{isZh 
            ? '师傅账号需要先在 Supabase Dashboard 中创建 auth.users 用户，然后将 user_id 关联到 masters 表。'
            : 'Master accounts need to be created in Supabase Dashboard as auth.users first, then link user_id to the masters table.'}</p>
        </div>
      </div>
    </div>
  );
}
