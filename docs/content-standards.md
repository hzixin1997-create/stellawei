# StellaWei Content Standards

## CTA 按钮规范

### 知识文章（Knowledge Articles）
所有知识文章子页面的 CTA 按钮必须统一：

- **英文：** `Book a Consultation`
- **中文：** `预约咨询`

**禁止**使用分类化的按钮文案，例如：
- ❌ Book a Compatibility Consultation
- ❌ Book a Decision Consultation
- ❌ Book a Relationship Repair Consultation
- ❌ Book a Post-Breakup Consultation
- ❌ Book a Love Timing Consultation
- ❌ 预约合婚咨询
- ❌ 预约决策咨询
- ❌ 预约关系修复咨询
- ❌ 预约分手后咨询
- ❌ 预约恋爱时机咨询

**原因：** 统一按钮降低用户决策成本，避免用户因按钮文案而犹豫是否点击。所有文章最终都导向同一个预约流程，无需在按钮上做细分。

### 数据文件位置
CTA 配置位于 `src/lib/knowledge-article-pages.ts`，每篇文章的 `cta` 字段：

```typescript
cta: {
  textLine1: "...",
  textLine1Cn: "...",
  textLine2: "...",
  textLine2Cn: "...",
  button: "Book a Consultation",      // 统一
  buttonCn: "预约咨询",               // 统一
  link: "/booking"
}
```

### Soulmate 文章例外
`src/app/knowledge/[slug]/[questionSlug]/page.tsx` 中的 SoulmateArticlePage 是硬编码组件，按钮文字直接写在该文件内：

```typescript
button: isZh ? "预约咨询" : "Book a Consultation"
```

修改时需同时更新数据文件和硬编码组件。
