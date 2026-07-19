"use client"

import { useRef, useState } from "react"
import { cn } from "@/lib/utils"

type Props = {
  value: string
  onChange: (value: string) => void
  language?: string
  placeholder?: string
  readOnly?: boolean
}

export function CodeEditor({ value, onChange, language = "javascript", placeholder, readOnly = false }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const gutterRef = useRef<HTMLDivElement>(null)
  const [lineCount, setLineCount] = useState(Math.max(value.split("\n").length, 1))

  function syncScroll() {
    if (gutterRef.current && textareaRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    if (readOnly) return
    onChange(e.target.value)
    setLineCount(Math.max(e.target.value.split("\n").length, 1))
  }

  // Tab key inserts spaces instead of moving focus
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (readOnly) return
    if (e.key === "Tab") {
      e.preventDefault()
      const el = textareaRef.current
      if (!el) return
      const start = el.selectionStart
      const end = el.selectionEnd
      const next = value.slice(0, start) + "  " + value.slice(end)
      onChange(next)
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + 2
      })
    }
  }

  return (
    <div className="rounded-md border overflow-hidden bg-[#1e1e1e]">
      {/* Editor title bar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[#252526] border-b border-black/40">
        <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
        <span className="ml-2 text-[11px] text-[#8b8b8b] font-mono">
          solution.{language === "sql" ? "sql" : "js"}
        </span>
      </div>

      {/* Editor body */}
      <div className="flex text-[13px] font-mono leading-6">
        <div
          ref={gutterRef}
          className="select-none text-right px-3 py-3 bg-[#1e1e1e] text-[#6e7681] overflow-hidden"
          style={{ minWidth: "3rem" }}
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onScroll={syncScroll}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          spellCheck={false}
          readOnly={readOnly}
          className={cn(
            "flex-1 bg-[#1e1e1e] text-[#d4d4d4] py-3 pr-4 outline-none resize-none",
            "h-64 leading-6",
            readOnly && "cursor-not-allowed opacity-60"
          )}
          style={{ tabSize: 2 }}
        />
      </div>
    </div>
  )
}