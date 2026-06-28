"use client"

import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { BookOpen, Plus, Trash2, Upload, ChevronLeft } from "lucide-react"
import { getBooks, deleteBook } from "@/lib/api"
import type { Book } from "@/lib/types"
import { toast } from "sonner"

const BACKEND = "/backend"

export default function BooksPage() {
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadBooks() }, [])

  async function loadBooks() {
    try {
      const data = await getBooks()
      setBooks(data.books)
    } catch {
      toast.error("加载书架失败")
    } finally {
      setLoading(false)
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append("file", file)
    formData.append("title", file.name.replace(/\.[^.]+$/, ""))

    try {
      toast.loading("上传中...")
      const res = await fetch(`${BACKEND}/api/books/upload`, {
        method: "POST",
        body: formData,
      })
      toast.dismiss()
      if (!res.ok) throw new Error(await res.text())
      toast.success("上传成功 ✧")
      loadBooks()
    } catch (e) {
      toast.dismiss()
      toast.error("上传失败: " + (e instanceof Error ? e.message : ""))
    }
    if (fileRef.current) fileRef.current.value = ""
  }

  async function handleDelete(bookId: string, title: string) {
    try {
      await deleteBook(bookId)
      setBooks((prev) => prev.filter((b) => b.id !== bookId))
      toast.success(`《${title}》已删除`)
    } catch {
      toast.error("删除失败")
    }
  }

  // 生成封面颜色（基于书名 hash）
  function coverColor(title: string): string {
    const hues = [15, 30, 45, 60, 120, 180, 210, 240, 270, 300, 330, 345]
    let hash = 0
    for (let i = 0; i < title.length; i++) {
      hash = title.charCodeAt(i) + ((hash << 5) - hash)
    }
    return `hsl(${hues[Math.abs(hash) % hues.length]}, 25%, ${30 + (Math.abs(hash) % 20)}%)`
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#c4a87a] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col pt-[env(safe-area-inset-top,12px)]">
      <div className="flex-1 overflow-y-auto px-5 pb-28">
        {/* 顶部 */}
        <div className="flex items-center justify-between pt-5 pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">书架</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">和砚迟一起看书</p>
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 rounded-xl bg-[#c4a87a] px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-[#b8996a]"
          >
            <Upload className="h-4 w-4" />
            上传
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.epub"
            className="hidden"
            onChange={handleUpload}
          />
        </div>

        {/* 书架 */}
        {books.length === 0 ? (
          <div className="mt-24 flex flex-col items-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border/30 bg-card/50">
              <BookOpen className="h-7 w-7 text-muted-foreground/40" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground/60">还没有书</p>
              <p className="mt-1 text-xs text-muted-foreground/40">上传一本开始阅读吧</p>
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="rounded-xl bg-[#c4a87a] px-4 py-2 text-xs font-medium text-white shadow-sm transition-all hover:bg-[#b8996a]"
            >
              <Upload className="mr-1.5 inline-block h-3.5 w-3.5" />
              上传第一本书
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {books.map((book) => (
              <Link
                key={book.id}
                href={`/books/${book.id}`}
                className="group relative flex flex-col items-center transition-all duration-200 hover:scale-[1.03]"
              >
                {/* 书脊 */}
                <div
                  className="relative flex h-44 w-full items-end justify-center overflow-hidden rounded-lg shadow-md transition-shadow group-hover:shadow-lg"
                  style={{ backgroundColor: coverColor(book.title) }}
                >
                  {/* 书名竖排 */}
                  <div className="mb-5 flex flex-col items-center px-2">
                    <span
                      className="text-center text-xs font-medium leading-relaxed text-white/90"
                      style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
                    >
                      {book.title}
                    </span>
                  </div>
                  {/* 进度条 */}
                  {book.progress > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
                      <div
                        className="h-full bg-white/60 transition-all"
                        style={{ width: `${book.progress}%` }}
                      />
                    </div>
                  )}
                  {/* 删除按钮 */}
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleDelete(book.id, book.title)
                    }}
                    className="absolute right-1 top-1 rounded p-1 text-white/40 opacity-0 transition-all hover:bg-destructive/30 hover:text-red-300 group-hover:opacity-100"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
                {/* 书名 */}
                <span className="mt-1.5 w-full truncate text-center text-[11px] font-medium text-foreground/80">
                  {book.title}
                </span>
                {book.progress > 0 && (
                  <span className="text-[10px] text-muted-foreground/50">
                    {book.progress}%
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
