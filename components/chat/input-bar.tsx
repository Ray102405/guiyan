"use client"

import { useState, useRef, useEffect } from "react"
import { ArrowUp, Square, Paperclip, X, SmilePlus } from "lucide-react"
import { cn } from "@/lib/utils"
import { EmojiPicker } from "./emoji-picker"

export interface AttachedFile {
  name: string
  type: string
  data: string // base64 for images, text content for text files
  preview?: string // data URL for image preview
}

interface InputBarProps {
  onSend: (content: string, files?: AttachedFile[]) => void
  onStop: () => void
  isStreaming: boolean
  disabled?: boolean
}

export function InputBar({ onSend, onStop, isStreaming, disabled }: InputBarProps) {
  const [input, setInput] = useState("")
  const [files, setFiles] = useState<AttachedFile[]>([])
  const [showEmoji, setShowEmoji] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const emojiRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭 emoji picker
  useEffect(() => {
    if (!showEmoji) return
    const close = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setShowEmoji(false)
      }
    }
    document.addEventListener("mousedown", close)
    return () => document.removeEventListener("mousedown", close)
  }, [showEmoji])

  const handleEmojiSelect = (emoji: string) => {
    const el = textareaRef.current
    if (!el) return
    const start = el.selectionStart ?? input.length
    const end = el.selectionEnd ?? input.length
    const newVal = input.slice(0, start) + emoji + input.slice(end)
    setInput(newVal)
    // 聚焦并移动光标到插入后
    requestAnimationFrame(() => {
      el.focus()
      el.selectionStart = el.selectionEnd = start + emoji.length
    })
  }

  useEffect(() => {
    if (!isStreaming && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isStreaming])

  const handleSubmit = () => {
    const trimmed = input.trim()
    if ((!trimmed && files.length === 0) || isStreaming || disabled) return
    onSend(trimmed, files.length > 0 ? files : undefined)
    setInput("")
    setFiles([])
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const el = e.target
    el.style.height = "auto"
    el.style.height = Math.min(el.scrollHeight, 120) + "px"
  }

  const handleFilePick = () => {
    fileRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files
    if (!fileList) return

    for (const file of Array.from(fileList)) {
      const maxSize = file.type.startsWith("image/") ? 5 * 1024 * 1024 : 1024 * 1024
      if (file.size > maxSize) {
        alert(`${file.name} 文件太大（最大 ${maxSize / 1024 / 1024}MB）`)
        continue
      }

      const data = await readFileAsData(file)
      const attached: AttachedFile = {
        name: file.name,
        type: file.type,
        data: data,
        preview: file.type.startsWith("image/") ? await readFileAsDataURL(file) : undefined,
      }
      setFiles((prev) => [...prev, attached])
    }

    e.target.value = ""
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="flex flex-col gap-2">
      {/* File chips */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {files.map((f, i) => (
            <div
              key={i}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-muted/30 px-2.5 py-1 text-xs"
            >
              {f.preview ? (
                <img src={f.preview} alt="" className="h-4 w-4 rounded object-cover" />
              ) : (
                <span className="text-[10px]">📄</span>
              )}
              <span className="max-w-[100px] truncate text-muted-foreground">{f.name}</span>
              <button
                onClick={() => removeFile(i)}
                className="text-muted-foreground/50 hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="glass flex items-end gap-1 rounded-2xl px-3 py-2">
          <div ref={emojiRef} className="relative">
            <button
              onClick={() => setShowEmoji(!showEmoji)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted transition-colors"
              title="表情"
            >
              <SmilePlus className="h-4 w-4" />
            </button>
            {showEmoji && (
              <EmojiPicker
                onSelect={handleEmojiSelect}
                onClose={() => setShowEmoji(false)}
              />
            )}
          </div>
          <button
            onClick={handleFilePick}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted transition-colors"
            title="上传文件"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/*,.txt,.md,.json,.csv,.log"
            className="hidden"
            onChange={handleFileChange}
          />

          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="说点什么……"
            rows={1}
            disabled={disabled}
            className={cn(
              "flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground/50",
              "min-h-[24px] max-h-[120px] scrollbar-thin",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          />

          {isStreaming ? (
            <button
              onClick={onStop}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
            >
              <Square className="h-4 w-4 fill-current" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!input.trim() && files.length === 0}
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors",
                input.trim() || files.length > 0
                  ? "bg-[#c4a87a] text-white hover:bg-[#b8986a]"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    )
}

async function readFileAsData(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.type.startsWith("text/") || file.type === "application/json") {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsText(file)
    } else {
      const reader = new FileReader()
      reader.onload = () => resolve((reader.result as string).split(",")[1] || "")
      reader.onerror = reject
      reader.readAsDataURL(file)
    }
  })
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
