# StellaWei Content Standards

## 中英双语规范

### 中文版本严禁混入英文

**规则：** 知识文章的中文版本（所有以 `Cn` 结尾的字段）中**不得出现任何英文单词**。

**包括：**
- 正文内容 (`heroIntroCn`, `easternDescCn`, `westernDescCn` 等)
- 案例故事 (`caseStudyCn` 的所有段落)
- 问答内容 (`whyPeopleAskCn`)
- 要点总结 (`keyTakeawaysCn`)

**例外（允许保留的英文）：**
- 品牌名：Stellawei（专有名词）
- 人名：如案例中的 "Emma"、"王先生"
- 已广泛接受的外来词：如 "塔罗"（已中文化）

**常见需替换的英文词汇示例：**
| ❌ 错误 | ✅ 正确 |
|--------|--------|
| milestone 生日 | 里程碑生日 / 人生重要节点 |
| executive 职位 | 高管职位 / 管理职位 |
| freelance 工作 | 自由职业 / 自由工作 |
| startup 公司 | 创业公司 / 初创企业 |
| networking | 人脉拓展 / 社交关系 |
| feedback | 反馈 / 意见 |

**原因：** 中文版本的目标用户是以中文为母语的读者，混入英文会降低阅读流畅度，显得不专业。品牌定位是「东西方命理」，不是「中英夹杂」。

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
