import type { ElementType, ReactNode } from 'react'

type MarkdownRendererProps = {
  children: string
  className?: string
}

type Block =
  | { type: 'heading'; depth: number; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'blockquote'; text: string }
  | { type: 'code'; text: string }
  | { type: 'list'; ordered: boolean; items: string[] }

export function MarkdownRenderer({ children, className = '' }: MarkdownRendererProps) {
  const blocks = parseMarkdown(children)

  return (
    <div className={`markdown-renderer${className ? ` ${className}` : ''}`}>
      {blocks.map((block, index) => renderBlock(block, index))}
    </div>
  )
}

function parseMarkdown(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const blocks: Block[] = []
  let paragraph: string[] = []
  let code: string[] | null = null
  let list: { ordered: boolean; items: string[] } | null = null
  let quote: string[] = []

  function flushParagraph() {
    if (!paragraph.length) return
    blocks.push({ type: 'paragraph', text: paragraph.join(' ') })
    paragraph = []
  }

  function flushList() {
    if (!list) return
    blocks.push({ type: 'list', ordered: list.ordered, items: list.items })
    list = null
  }

  function flushQuote() {
    if (!quote.length) return
    blocks.push({ type: 'blockquote', text: quote.join(' ') })
    quote = []
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()

    if (line.startsWith('```')) {
      flushParagraph()
      flushList()
      flushQuote()
      if (code) {
        blocks.push({ type: 'code', text: code.join('\n') })
        code = null
      } else {
        code = []
      }
      continue
    }

    if (code) {
      code.push(rawLine)
      continue
    }

    if (!line.trim()) {
      flushParagraph()
      flushList()
      flushQuote()
      continue
    }

    const heading = /^(#{1,6})\s+(.+)$/.exec(line)
    if (heading) {
      flushParagraph()
      flushList()
      flushQuote()
      blocks.push({ type: 'heading', depth: heading[1].length, text: heading[2] })
      continue
    }

    const unordered = /^[-*]\s+(.+)$/.exec(line)
    const ordered = /^\d+[.)]\s+(.+)$/.exec(line)
    if (unordered || ordered) {
      flushParagraph()
      flushQuote()
      const orderedList = Boolean(ordered)
      if (!list || list.ordered !== orderedList) flushList()
      list ??= { ordered: orderedList, items: [] }
      list.items.push((unordered?.[1] ?? ordered?.[1] ?? '').trim())
      continue
    }

    const quoted = /^>\s?(.+)$/.exec(line)
    if (quoted) {
      flushParagraph()
      flushList()
      quote.push(quoted[1])
      continue
    }

    flushList()
    flushQuote()
    paragraph.push(line.trim())
  }

  flushParagraph()
  flushList()
  flushQuote()
  if (code) blocks.push({ type: 'code', text: code.join('\n') })

  return blocks
}

function renderBlock(block: Block, index: number) {
  if (block.type === 'heading') {
    const Heading = `h${Math.min(block.depth + 1, 6)}` as ElementType
    return <Heading key={index}>{renderInline(block.text)}</Heading>
  }

  if (block.type === 'paragraph') return <p key={index}>{renderInline(block.text)}</p>

  if (block.type === 'blockquote') {
    return <blockquote key={index}>{renderInline(block.text)}</blockquote>
  }

  if (block.type === 'code') {
    return (
      <pre key={index}>
        <code>{block.text}</code>
      </pre>
    )
  }

  const List = block.ordered ? 'ol' : 'ul'
  return (
    <List key={index}>
      {block.items.map((item, itemIndex) => (
        <li key={`${itemIndex}-${item.slice(0, 24)}`}>{renderInline(item)}</li>
      ))}
    </List>
  )
}

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = []
  const pattern = /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g
  let cursor = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text))) {
    if (match.index > cursor) nodes.push(text.slice(cursor, match.index))
    nodes.push(renderInlineToken(match[0], nodes.length))
    cursor = match.index + match[0].length
  }

  if (cursor < text.length) nodes.push(text.slice(cursor))
  return nodes
}

function renderInlineToken(token: string, key: number): ReactNode {
  if (token.startsWith('**') || token.startsWith('__')) {
    return <strong key={key}>{token.slice(2, -2)}</strong>
  }

  if (token.startsWith('`')) {
    return <code key={key}>{token.slice(1, -1)}</code>
  }

  if (token.startsWith('[')) {
    const match = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token)
    if (match) {
      return (
        <a href={match[2]} key={key} rel="noreferrer" target="_blank">
          {match[1]}
        </a>
      )
    }
  }

  return <em key={key}>{token.slice(1, -1)}</em>
}
