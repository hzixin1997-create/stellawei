#!/usr/bin/env python3
"""Stellawei 图片完整性守门脚本。

用法:
  python3 scripts/verify-images.py --ci [--base <ref>] [--head <ref>]
      CI 模式: 校验 diff 范围内变更的图片 + 全量校验基准清单。
      PR 场景: --base origin/main --head HEAD
      push 场景: --base <before-sha> --head HEAD

  python3 scripts/verify-images.py --staged
      pre-commit 模式: 校验 git 暂存区中的图片。

  python3 scripts/verify-images.py --update-baseline
      重新生成 scripts/image-checksums.txt 基准清单。
      仅限维护者在合法图片更新后使用。

退出码:
  0 = 全部通过
  1 = 至少一项校验失败(含任何单张图片失败)
  2 = 脚本自身错误(如依赖缺失、git 命令失败)
"""

import argparse
import hashlib
import io
import json
import os
import subprocess
import sys

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".avif"}
BASELINE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "image-checksums.txt")
# 关键图片 glob 根目录(相对仓库根)
KEY_IMAGE_DIRS = ("public/",)


def run(cmd):
    """执行命令并返回 stdout;失败时 exit 2。"""
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        sys.stderr.write(f"[FATAL] 命令失败: {' '.join(cmd)}\n{result.stderr[:500]}\n")
        sys.exit(2)
    return result.stdout


def try_run(cmd):
    """执行命令,返回 (returncode, stdout)。"""
    result = subprocess.run(cmd, capture_output=True, text=True)
    return result.returncode, result.stdout


def sha256_of(data):
    return hashlib.sha256(data).hexdigest()


def is_image(path):
    _, ext = os.path.splitext(path.lower())
    return ext in IMAGE_EXTS


def decode_check(path):
    """返回 (ok, message)。ok=False 表示校验失败。"""
    try:
        from PIL import Image
    except ImportError:
        sys.stderr.write("[FATAL] 缺少 Pillow: pip install Pillow\n")
        sys.exit(2)

    if not os.path.exists(path):
        return False, "文件不存在"

    size = os.path.getsize(path)
    if size == 0:
        return False, "文件大小为 0"

    try:
        with open(path, "rb") as f:
            data = f.read()
        im = Image.open(io.BytesIO(data))
        im.load()
        fmt = (im.format or "").lower()
        ext = os.path.splitext(path.lower())[1].lstrip(".")
        # 格式与扩展名匹配检查(jpeg/jpg 视为等价)
        fmt_aliases = {"jpg": "jpeg", "jpeg": "jpeg", "png": "png", "webp": "webp", "gif": "gif"}
        expected = fmt_aliases.get(ext)
        if expected and fmt != expected:
            return False, f"格式不匹配: 扩展名 .{ext} 但实际是 {fmt}"
        return True, f"{size:,} B  {im.size[0]}x{im.size[1]}  {fmt}"
    except Exception as e:
        return False, f"解码失败: {str(e)[:80]}"


def get_changed_images(base, head):
    """返回 (added_or_modified, deleted) 图片列表。"""
    rc, out = try_run(["git", "merge-base", base, head])
    if rc != 0:
        sys.stderr.write(f"[FATAL] 无法计算 merge-base: {base} {head}\n")
        sys.exit(2)
    merge_base = out.strip()

    rc, out = try_run(["git", "diff", "--name-status", "--diff-filter=ACMRT", merge_base, head])
    if rc != 0:
        sys.stderr.write(f"[FATAL] git diff 失败\n")
        sys.exit(2)
    changed = [line.split("\t")[-1] for line in out.strip().splitlines() if line.strip()]

    rc, out = try_run(["git", "diff", "--name-only", "--diff-filter=D", merge_base, head])
    if rc != 0:
        sys.exit(2)
    deleted = [line for line in out.strip().splitlines() if line.strip()]

    changed_imgs = [p for p in changed if is_image(p)]
    deleted_imgs = [p for p in deleted if is_image(p)]
    return changed_imgs, deleted_imgs


def get_staged_images():
    rc, out = try_run(["git", "diff", "--cached", "--name-only", "--diff-filter=ACMRT"])
    if rc != 0:
        sys.stderr.write("[FATAL] git diff --cached 失败\n")
        sys.exit(2)
    return [p for p in out.strip().splitlines() if p.strip() and is_image(p)]


def load_baseline():
    """读取基准清单 {path: sha256}。文件不存在时返回空 dict。"""
    entries = {}
    if not os.path.exists(BASELINE_PATH):
        return entries
    with open(BASELINE_PATH) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            parts = line.split(None, 1)
            if len(parts) == 2:
                entries[parts[1].strip()] = parts[0]
    return entries


def scan_key_images():
    """扫描仓库中所有关键目录的图片。"""
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    found = []
    for d in KEY_IMAGE_DIRS:
        abs_d = os.path.join(repo_root, d)
        for dirpath, _, filenames in os.walk(abs_d):
            for fn in filenames:
                if is_image(fn):
                    rel = os.path.relpath(os.path.join(dirpath, fn), repo_root)
                    found.append(rel)
    return sorted(found)


def cmd_update_baseline():
    images = scan_key_images()
    lines = ["# Stellawei 关键图片 SHA-256 基准清单",
             "# 由 scripts/verify-images.py --update-baseline 生成",
             "# 合法更新图片后请重新生成并随 PR 提交本文件", ""]
    entries = []
    for rel in images:
        with open(rel, "rb") as f:
            digest = sha256_of(f.read())
        entries.append(f"{digest}  {rel}")
    lines.extend(entries)
    with open(BASELINE_PATH, "w") as f:
        f.write("\n".join(lines) + "\n")
    print(f"基准清单已更新: {len(entries)} 张图片 -> {BASELINE_PATH}")
    return 0


def cmd_staged():
    staged = get_staged_images()
    if not staged:
        print("pre-commit: 暂存区无图片变更,通过")
        return 0

    failures = 0
    print(f"pre-commit: 校验 {len(staged)} 张暂存图片...")
    for p in staged:
        ok, msg = decode_check(p)
        status = "OK " if ok else "FAIL"
        print(f"  [{status}] {p}: {msg}")
        if not ok:
            failures += 1

    if failures:
        print(f"\npre-commit: {failures}/{len(staged)} 张图片校验失败,提交被阻止。")
        print("如果这是合法图片更新,请确认图片本身无损后重试;")
        print("如确认无误仍失败,请联系维护者检查 scripts/verify-images.py。")
        return 1
    print("pre-commit: 全部通过")
    return 0


def cmd_ci(base, head):
    failures = 0
    warnings = 0

    # 1) diff 范围图片校验
    changed, deleted = get_changed_images(base, head)
    print(f"== diff 图片变更: {len(changed)} 张新增/修改, {len(deleted)} 张删除 ==")

    for p in changed:
        ok, msg = decode_check(p)
        status = "OK " if ok else "FAIL"
        print(f"  [{status}] {p}: {msg}")
        if not ok:
            failures += 1

    for p in deleted:
        print(f"  [DEL ] {p}: 已删除(跳过完整性校验)")
        # 删除清单内图片由清单校验环节统一告警

    # 2) knowledge-* 与图片同时变更检测
    rc, out = try_run(["git", "merge-base", base, head])
    merge_base = out.strip()
    rc, out = try_run(["git", "diff", "--name-only", merge_base, head])
    all_changed = [l for l in out.strip().splitlines() if l.strip()]
    knowledge_changed = any("knowledge" in p for p in all_changed)
    if knowledge_changed and changed:
        warnings += 1
        print(f"\n⚠️  人工审核要求: knowledge-* 文件与 {len(changed)} 张图片同时变更:")
        for p in changed:
            print(f"    - {p}")
        print("   若属合法图片更新(如更换师傅照片),请在 PR 中说明并同步更新基准清单:")
        print("     python3 scripts/verify-images.py --update-baseline")
        print("   若非预期变更,请检查工作区是否有并发的构建/部署进程在写 public/。")

    # 3) 基准清单全量校验(检测非预期变化,不替代完整性检查)
    baseline = load_baseline()
    if baseline:
        print(f"\n== 基准清单校验 ({len(baseline)} 张关键图片) ==")
        missing = []
        for path, expected in baseline.items():
            if not os.path.exists(path):
                missing.append(path)
                print(f"  [FAIL] {path}: 清单内图片被删除或移动")
                failures += 1
                continue
            with open(path, "rb") as f:
                actual = sha256_of(f.read())
            if actual != expected:
                print(f"  [WARN] {path}: SHA-256 与基准不一致(可能是合法更新)")
                print(f"         期望 {expected[:16]}… 实际 {actual[:16]}…")
                warnings += 1
            else:
                print(f"  [OK ] {path}")
        if missing:
            print("  提示: 删除清单内图片需同步更新 scripts/image-checksums.txt")
    else:
        print("!! 基准清单不存在,跳过清单校验(请运行 --update-baseline 生成)")

    # 4) 汇总
    print(f"\n== 汇总: {failures} 失败 / {warnings} 警告 ==")
    if failures:
        print("❌ Image Guard 失败: 存在损坏或缺失的图片,已阻止。")
        return 1
    if warnings:
        print("⚠️  Image Guard 通过(含人工审核警告)。")
        return 0
    print("✅ Image Guard 全部通过。")
    return 0


def main():
    parser = argparse.ArgumentParser(description="Stellawei 图片完整性守门")
    parser.add_argument("--ci", action="store_true", help="CI 模式")
    parser.add_argument("--staged", action="store_true", help="pre-commit 暂存区模式")
    parser.add_argument("--update-baseline", action="store_true", help="重新生成基准清单")
    parser.add_argument("--base", default="origin/main", help="diff 基点(默认 origin/main)")
    parser.add_argument("--head", default="HEAD", help="diff 终点(默认 HEAD)")
    args = parser.parse_args()

    # 任何模式下,先验证我们在 git 仓库内
    rc, _ = try_run(["git", "rev-parse", "--git-dir"])
    if rc != 0:
        sys.stderr.write("[FATAL] 不在 git 仓库内\n")
        sys.exit(2)

    try:
        if args.update_baseline:
            sys.exit(cmd_update_baseline())
        elif args.staged:
            sys.exit(cmd_staged())
        elif args.ci:
            sys.exit(cmd_ci(args.base, args.head))
        else:
            parser.print_help()
            sys.exit(2)
    except SystemExit:
        raise
    except Exception as e:
        sys.stderr.write(f"[FATAL] 脚本异常: {e}\n")
        sys.exit(2)


if __name__ == "__main__":
    main()
