'use client'

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Home, ArrowLeft } from "lucide-react"

export default function NotFound() {
  const [isZh, setIsZh] = useState(true)

  useEffect(() => {
    const lang = localStorage.getItem('language') || 'zh'
    setIsZh(lang === 'zh')
  }, [])

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="text-center px-4">
        <h1 className="text-9xl font-serif font-bold text-stellawei-purple mb-4">404</h1>
        <h2 className="text-3xl font-serif font-bold mb-4">{isZh ? '页面未找到' : 'Page Not Found'}</h2>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          {isZh
            ? '您要访问的页面似乎已消失在宇宙虚空中。让我们带您回到灵性之旅的正轨。'
            : "The page you're looking for seems to have vanished into the cosmic void. Let's get you back on your spiritual journey."}
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/">
            <Button size="lg">
              <Home className="w-4 h-4 mr-2" />
              {isZh ? '返回首页' : 'Back to Home'}
            </Button>
          </Link>
          
          <Link href="/">
            <Button variant="outline" size="lg">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {isZh ? '返回' : 'Go Back'}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
