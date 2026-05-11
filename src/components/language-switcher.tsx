"use client";

import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe } from "lucide-react";

const languages = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
];

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const currentLang = i18n.language || "en";

  const handleChange = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  const current = languages.find((l) => l.code === currentLang) || languages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-slate-300 hover:text-amber-400 hover:bg-slate-800"
        >
          <Globe className="w-4 h-4 mr-1.5" />
          <span className="mr-1">{current.flag}</span>
          <span className="hidden sm:inline">{current.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="bg-slate-900 border-slate-700"
      >
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleChange(lang.code)}
            className={`cursor-pointer text-slate-300 hover:text-amber-400 hover:bg-slate-800 ${
              currentLang === lang.code ? "bg-slate-800 text-amber-400" : ""
            }`}
          >
            <span className="mr-2">{lang.flag}</span>
            {lang.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
