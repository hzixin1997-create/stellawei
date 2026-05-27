"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Copy, Check, ExternalLink } from "lucide-react";

// 检测微信环境（微信内置浏览器 / 企业微信 / 微信小程序 WebView）
export const isWeChatBrowser = (): boolean => {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  return (
    ua.includes("micromessenger") ||
    ua.includes("wechat") ||
    ua.includes("wxwork")
  );
};

// localStorage key
const DISMISS_KEY = "wechat_browser_dismissed_until";
const COOLDOWN_MS = 30 * 60 * 1000; // 30 分钟

// 检查是否在冷却期内
export const isInCooldown = (): boolean => {
  if (typeof localStorage === "undefined") return false;
  const until = localStorage.getItem(DISMISS_KEY);
  if (!until) return false;
  return Date.now() < parseInt(until, 10);
};

// 设置冷却标记
export const setCooldown = (): void => {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(DISMISS_KEY, String(Date.now() + COOLDOWN_MS));
};

interface WeChatBrowserModalProps {
  open: boolean;
  onClose: () => void;
}

export function WeChatBrowserModal({ open, onClose }: WeChatBrowserModalProps) {
  const [copied, setCopied] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 200);
      return () => clearTimeout(timer);
    }
  }, [open]);

  if (!isVisible && !open) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText("https://stellawei.org");
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // 降级方案：兼容旧浏览器 / iOS WebView
      const input = document.createElement("input");
      input.value = "https://stellawei.org";
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      input.setSelectionRange(0, 99999);
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleDismiss = () => {
    setCooldown();
    onClose();
  };

  return (
    <div
      className={`
        fixed inset-0 z-[9999] flex items-center justify-center px-4
        transition-opacity duration-200
        ${open ? "opacity-100" : "opacity-0 pointer-events-none"}
      `}
    >
      {/* 半透明遮罩 */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleDismiss} />

      {/* 白色卡片 */}
      <div
        className={`
          relative w-full max-w-md bg-white rounded-2xl shadow-2xl
          transition-all duration-200 overflow-hidden
          ${open ? "scale-100 translate-y-0" : "scale-95 translate-y-2"}
        `}
      >
        {/* 头部 */}
        <div className="bg-stellawei-purple px-6 py-4 flex items-center justify-between">
          <h2 className="text-white font-serif text-lg font-semibold">
            请在浏览器中完成支付
          </h2>
          <button
            onClick={handleDismiss}
            className="text-white/80 hover:text-white transition-colors"
            aria-label="关闭"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容 */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-stellawei-purple-dark text-sm leading-relaxed">
            微信内无法使用支付宝，请点击右上角「⋯」→「在浏览器打开」，
            或使用 Safari / Chrome 直接访问 stellawei.org。
          </p>

          {/* 步骤 */}
          <ol className="space-y-3 text-sm">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-stellawei-purple text-white text-xs font-bold flex items-center justify-center mt-0.5">
                1
              </span>
              <span className="text-gray-700">
                点击右上角{" "}
                <strong className="text-stellawei-purple-dark">「⋯」</strong>{" "}
                菜单
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-stellawei-purple text-white text-xs font-bold flex items-center justify-center mt-0.5">
                2
              </span>
              <span className="text-gray-700">
                选择{" "}
                <strong className="text-stellawei-purple-dark">
                  「在浏览器打开」
                </strong>
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-stellawei-purple text-white text-xs font-bold flex items-center justify-center mt-0.5">
                3
              </span>
              <span className="text-gray-700">
                访问{" "}
                <strong className="text-stellawei-purple-dark">
                  stellawei.org
                </strong>{" "}
                重新支付
              </span>
            </li>
          </ol>

          {/* 分隔线 */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs text-gray-500 mb-3">
              或复制下方链接，在 Safari / Chrome 中打开：
            </p>

            <div className="flex items-center gap-2 bg-stellawei-cream rounded-lg px-3 py-2.5 border border-stellawei-cream-dark">
              <ExternalLink className="w-4 h-4 text-stellawei-purple flex-shrink-0" />
              <span className="text-sm text-stellawei-purple-dark font-medium truncate flex-1">
                https://stellawei.org
              </span>
            </div>
          </div>

          {/* 按钮区 */}
          <div className="flex flex-col gap-2.5 pt-1">
            <Button
              onClick={handleCopy}
              variant="outline"
              className={`w-full h-11 text-sm font-medium transition-all duration-200 ${
                copied
                  ? "border-green-500 text-green-600 bg-green-50"
                  : "border-stellawei-purple text-stellawei-purple hover:bg-stellawei-purple/5"
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  链接已复制
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  复制网站链接
                </>
              )}
            </Button>

            <Button
              onClick={handleDismiss}
              className="w-full h-11 text-sm font-medium bg-stellawei-purple hover:bg-stellawei-purple-dark text-white"
            >
              我知道了
            </Button>
          </div>

          {/* 底部提示 */}
          <p className="text-center text-xs text-gray-400">
            30 分钟内不再提示此提醒
          </p>
        </div>
      </div>
    </div>
  );
}
