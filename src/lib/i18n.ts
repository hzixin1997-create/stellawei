import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

const resources = {
  en: {
    translation: {
      // Navigation
      'nav.home': 'Home',
      'nav.masters': 'Masters',
      'nav.services': 'Services',
      'nav.booking': 'Book Now',
      'nav.login': 'Sign In',
      'nav.logout': 'Sign Out',
      'nav.dashboard': 'Dashboard',
      
      // Hero
      'hero.title': 'Ancient Wisdom, Modern Guidance',
      'hero.subtitle': 'Connect with authentic masters for personalized astrology, tarot, and spiritual consultations',
      'hero.cta': 'Start Your Journey',
      
      // Masters
      'masters.title': 'Our Masters',
      'masters.subtitle': 'Experienced practitioners dedicated to guiding your path',
      'masters.experience': '{{years}} years experience',
      'masters.book': 'Book Consultation',
      'masters.learn_more': 'Learn More',
      
      // Services
      'services.title': 'Consultation Services',
      'services.subtitle': 'Choose the guidance that resonates with your journey',
      'services.tarot': 'Tarot Reading',
      'services.bazi': 'Bazi Analysis',
      'services.spiritual': 'Spiritual Guidance',
      
      // Booking
      'booking.title': 'Book Your Consultation',
      'booking.step1': 'Select Master',
      'booking.step2': 'Choose Service',
      'booking.step3': 'Pick Date & Time',
      'booking.step4': 'Confirm & Pay',
      'booking.select_master': 'Choose your master',
      'booking.select_service': 'Select service type',
      'booking.select_time': 'Choose available time',
      'booking.price': 'Price',
      'booking.duration': 'Duration',
      'booking.confirm': 'Confirm Booking',
      'booking.pay_now': 'Pay Now',
      
      // Confirmation
      'confirmation.title': 'Booking Confirmed',
      'confirmation.thank_you': 'Thank you for your booking!',
      'confirmation.email_sent': 'A confirmation email has been sent to {{email}}',
      'confirmation.countdown': 'Your consultation starts in',
      'confirmation.supplement': 'Supplement Information',
      'confirmation.supplement_desc': 'Help your master prepare by sharing background information (optional)',
      'confirmation.supplement_placeholder': 'Describe your question or situation...',
      'confirmation.submit': 'Submit to Master',
      'confirmation.submitted': 'Submitted successfully',
      
      // Chat
      'chat.online': 'Online',
      'chat.typing': 'typing...',
      'chat.placeholder': 'Type your message...',
      'chat.send': 'Send',
      'chat.time_remaining': '{{time}} remaining',
      
      // Master Dashboard
      'master.dashboard': 'Master Dashboard',
      'master.orders': 'My Orders',
      'master.earnings': 'My Earnings',
      'master.supplement': 'Client Background',
      'master.supplement_new': 'New Supplement',
      'master.supplement_desc': 'Client submitted background information',
      
      // Payment
      'payment.success': 'Payment Successful',
      'payment.thank_you': 'Thank you for your payment',
      'payment.redirect': 'Redirecting to confirmation...',
      'payment.failed': 'Payment Failed',
      'payment.try_again': 'Please try again',
      
      // Footer
      'footer.rights': '© 2024 Stellawei. All rights reserved.',
      'footer.terms': 'Terms of Service',
      'footer.privacy': 'Privacy Policy',
      
      // Language
      'language.en': 'English',
      'language.zh': '中文',
      'language.switch': 'Switch Language',
    }
  },
  zh: {
    translation: {
      // Navigation
      'nav.home': '首页',
      'nav.masters': '大师',
      'nav.services': '服务',
      'nav.booking': '立即预约',
      'nav.login': '登录',
      'nav.logout': '退出',
      'nav.dashboard': '个人中心',
      
      // Hero
      'hero.title': '古老智慧，现代指引',
      'hero.subtitle': '与真正的命理大师连接，获取个性化的占星、塔罗和精神咨询',
      'hero.cta': '开启您的旅程',
      
      // Masters
      'masters.title': '我们的大师',
      'masters.subtitle': '经验丰富的修行者，致力于指引您的人生道路',
      'masters.experience': '{{years}}年经验',
      'masters.book': '预约咨询',
      'masters.learn_more': '了解更多',
      
      // Services
      'services.title': '咨询服务',
      'services.subtitle': '选择与您旅程共鸣的指引',
      'services.tarot': '塔罗占卜',
      'services.bazi': '八字分析',
      'services.spiritual': '灵性指导',
      
      // Booking
      'booking.title': '预约咨询',
      'booking.step1': '选择大师',
      'booking.step2': '选择服务',
      'booking.step3': '选择时间',
      'booking.step4': '确认并支付',
      'booking.select_master': '选择您的大师',
      'booking.select_service': '选择服务类型',
      'booking.select_time': '选择可用时间',
      'booking.price': '价格',
      'booking.duration': '时长',
      'booking.confirm': '确认预约',
      'booking.pay_now': '立即支付',
      
      // Confirmation
      'confirmation.title': '预约确认',
      'confirmation.thank_you': '感谢您的预约！',
      'confirmation.email_sent': '确认邮件已发送至 {{email}}',
      'confirmation.countdown': '您的咨询将在',
      'confirmation.supplement': '补充信息',
      'confirmation.supplement_desc': '分享背景信息帮助大师准备（可选）',
      'confirmation.supplement_placeholder': '描述您的问题或情况...',
      'confirmation.submit': '提交给大师',
      'confirmation.submitted': '提交成功',
      
      // Chat
      'chat.online': '在线',
      'chat.typing': '正在输入...',
      'chat.placeholder': '输入您的消息...',
      'chat.send': '发送',
      'chat.time_remaining': '剩余 {{time}}',
      
      // Master Dashboard
      'master.dashboard': '大师控制台',
      'master.orders': '我的订单',
      'master.earnings': '我的收入',
      'master.supplement': '客户背景',
      'master.supplement_new': '新留言',
      'master.supplement_desc': '客户提交的补充信息',
      
      // Payment
      'payment.success': '支付成功',
      'payment.thank_you': '感谢您的支付',
      'payment.redirect': '正在跳转至确认页面...',
      'payment.failed': '支付失败',
      'payment.try_again': '请重试',
      
      // Footer
      'footer.rights': '© 2024 Stellawei. 保留所有权利。',
      'footer.terms': '服务条款',
      'footer.privacy': '隐私政策',
      
      // Language
      'language.en': 'English',
      'language.zh': '中文',
      'language.switch': '切换语言',
    }
  }
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
  })

export default i18n