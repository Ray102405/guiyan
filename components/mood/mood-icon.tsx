"use client"

/**
 * 暖金描边心情图标 · 8 种心情统一 SVG
 * =====================================
 * 全局任何地方显示心情都用此组件。
 * 数据层仍存 emoji，显示层只用 SVG。
 */

import type { CSSProperties } from "react"

// ── SVG 基础属性 ──
const _svgProps = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
}

function HappyIcon(props: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" {..._svgProps} className={props.className} style={props.style}>
      {/* 眼睛 */}
      <circle cx="8" cy="10" r="1.5" />
      <circle cx="16" cy="10" r="1.5" />
      {/* 上扬笑脸 */}
      <path d="M 7 14 Q 12 19 17 14" />
      {/* 光晕射线 */}
      <line x1="12" y1="2" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="22" />
      <line x1="2" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="22" y2="12" />
      <line x1="5" y1="5" x2="5.7" y2="5.7" />
      <line x1="18.3" y1="18.3" x2="19" y2="19" />
      <line x1="5" y1="19" x2="5.7" y2="18.3" />
      <line x1="18.3" y1="5.7" x2="19" y2="5" />
    </svg>
  )
}

function CalmIcon(props: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" {..._svgProps} className={props.className} style={props.style}>
      <path d="M 3 8 Q 7 5 11 8 T 21 8" />
      <path d="M 3 12 Q 7 9 11 12 T 21 12" />
      <path d="M 3 16 Q 7 13 11 16 T 21 16" />
    </svg>
  )
}

function SweetIcon(props: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" {..._svgProps} className={props.className} style={props.style}>
      <path d="M 12 21.35 l -1.45 -1.32 C 5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3 c 1.74 0 3.41 .81 4.5 2.09 C 13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5 c 0 3.78 -3.4 6.86 -8.55 11.54 L 12 21.35 Z" />
    </svg>
  )
}

function OkayIcon(props: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" {..._svgProps} className={props.className} style={props.style}>
      <line x1="4" y1="12" x2="20" y2="12" />
      <circle cx="12" cy="12" r="2.5" fill="currentColor" />
    </svg>
  )
}

function SadIcon(props: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" {..._svgProps} className={props.className} style={props.style}>
      <path d="M 7 16 Q 12 11 17 16" />
      <path d="M 16 5 C 16 5 19 11 16 13 C 13 11 16 5 16 5 Z" />
    </svg>
  )
}

function AnnoyedIcon(props: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" {..._svgProps} className={props.className} style={props.style}>
      <polyline points="6 8 10 12 6 16" />
      <polyline points="18 8 14 12 18 16" />
    </svg>
  )
}

function TiredIcon(props: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" {..._svgProps} className={props.className} style={props.style}>
      <path d="M 17 6 A 10 10 0 1 0 20 15 A 7 7 0 1 1 17 6 Z" />
      <line x1="5.5" y1="5.5" x2="5.5" y2="8.5" />
      <line x1="4" y1="7" x2="7" y2="7" />
    </svg>
  )
}

function NiceIcon(props: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" {..._svgProps} className={props.className} style={props.style}>
      <circle cx="12" cy="12" r="2" fill="currentColor" />
      <line x1="12" y1="3" x2="12" y2="7" />
      <line x1="12" y1="17" x2="12" y2="21" />
      <line x1="3" y1="12" x2="7" y2="12" />
      <line x1="17" y1="12" x2="21" y2="12" />
    </svg>
  )
}

// ── 图标映射 ──
const ICON_MAP: Record<string, React.FC<{ className?: string; style?: CSSProperties }>> = {
  happy: HappyIcon,
  calm: CalmIcon,
  sweet: SweetIcon,
  okay: OkayIcon,
  sad: SadIcon,
  annoyed: AnnoyedIcon,
  tired: TiredIcon,
  nice: NiceIcon,
}

// ── 心情中文标签（UI 层，独立于数据层） ──
export const MOOD_LABELS: Record<string, string> = {
  happy: "开心",
  calm: "放松",
  sweet: "喜欢",
  okay: "一般",
  sad: "难过",
  annoyed: "生气",
  tired: "困",
  nice: "期待",
}

/**
 * MoodIcon — 统一心情图标组件
 *
 * @param mood  心情 key（"happy" | "calm" | …），匹配 MOOD_OPTIONS 的 mood 字段
 * @param className 可选 Tailwind class
 * @param style 可选内联样式（用于动画）
 */
export function MoodIcon({
  mood,
  className,
  style,
  title,
}: {
  mood: string
  className?: string
  style?: CSSProperties
  title?: string
}) {
  const Icon = ICON_MAP[mood]
  if (!Icon) return <span className={className}>💭</span>
  return <span title={title}><Icon className={className} style={style} /></span>
}
