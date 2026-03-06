import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const SYS = 'system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'

export default function ReadmePage({ isDark, onBack }) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('https://raw.githubusercontent.com/matthewlew/open-icons-playground/main/README.md')
      .then(r => r.text())
      .then(text => { setContent(text); setLoading(false) })
      .catch(() => { setContent('Failed to load README.'); setLoading(false) })
  }, [])

  const C = isDark
    ? { bg: '#090909', s1: '#0F0F0F', s2: '#161616', bd: '#2E2E2E', fg: '#E8E8E8', fgd: '#6A6A6A', acc: '#FF6B2B', blue: '#4B9EFF', green: '#3FEF9A', code: '#1C1C1C' }
    : { bg: '#F0EEE9', s1: '#FAFAF8', s2: '#F0EDE7', bd: '#D6D2CA', fg: '#1C1B18', fgd: '#7A756C', acc: '#C94B0A', blue: '#2060BB', green: '#157A4A', code: '#E5E1D9' }

  return (
    <div style={{ fontFamily: SYS, background: C.bg, color: C.fg, minHeight: '100vh' }}>
      {/* Top bar */}
      <div style={{ borderBottom: `1px solid ${C.bd}`, padding: '0 24px', display: 'flex', alignItems: 'center', height: 50, gap: 14, position: 'sticky', top: 0, background: C.bg, zIndex: 10 }}>
        <button onClick={onBack} style={{ background: 'none', border: `1px solid ${C.bd}`, borderRadius: 5, color: C.fgd, cursor: 'pointer', padding: '4px 12px', fontSize: 12, fontFamily: SYS, display: 'flex', alignItems: 'center', gap: 6 }}>
          ← Back to Playground
        </button>
        <span style={{ fontWeight: 700, fontSize: 14, color: C.fg }}>README</span>
        <a href="https://github.com/matthewlew/open-icons-playground" target="_blank" rel="noreferrer"
          style={{ marginLeft: 'auto', color: C.acc, fontSize: 12, fontFamily: SYS, textDecoration: 'none' }}>
          View on GitHub →
        </a>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 32px 80px' }}>
        {loading ? (
          <div style={{ color: C.fgd, fontSize: 14 }}>Loading README...</div>
        ) : (
          <div className="readme-body">
            <style>{`
              .readme-body h1 { font-size: 2em; font-weight: 700; border-bottom: 1px solid ${C.bd}; padding-bottom: 12px; margin-bottom: 16px; color: ${C.fg}; }
              .readme-body h2 { font-size: 1.4em; font-weight: 700; border-bottom: 1px solid ${C.bd}; padding-bottom: 8px; margin: 32px 0 12px; color: ${C.fg}; }
              .readme-body h3 { font-size: 1.1em; font-weight: 600; margin: 24px 0 8px; color: ${C.fg}; }
              .readme-body p { line-height: 1.7; margin: 0 0 12px; color: ${C.fg}; font-size: 14px; }
              .readme-body a { color: ${C.acc}; text-decoration: none; }
              .readme-body a:hover { text-decoration: underline; }
              .readme-body code { background: ${C.code}; border-radius: 4px; padding: 2px 6px; font-size: 12px; font-family: 'SF Mono', 'Fira Code', monospace; color: ${C.acc}; }
              .readme-body pre { background: ${C.code}; border: 1px solid ${C.bd}; border-radius: 6px; padding: 16px; overflow-x: auto; margin: 12px 0 16px; }
              .readme-body pre code { background: none; padding: 0; color: ${C.fg}; font-size: 13px; }
              .readme-body blockquote { border-left: 3px solid ${C.acc}; margin: 0 0 12px; padding: 8px 16px; background: ${C.s2}; border-radius: 0 6px 6px 0; color: ${C.fgd}; font-style: italic; }
              .readme-body ul, .readme-body ol { padding-left: 24px; margin: 0 0 12px; color: ${C.fg}; font-size: 14px; }
              .readme-body li { line-height: 1.7; margin-bottom: 4px; }
              .readme-body table { width: 100%; border-collapse: collapse; margin: 12px 0 20px; font-size: 13px; }
              .readme-body th { background: ${C.s2}; color: ${C.fg}; font-weight: 600; padding: 8px 12px; border: 1px solid ${C.bd}; text-align: left; }
              .readme-body td { padding: 8px 12px; border: 1px solid ${C.bd}; color: ${C.fg}; }
              .readme-body tr:nth-child(even) td { background: ${C.s1}; }
              .readme-body hr { border: none; border-top: 1px solid ${C.bd}; margin: 28px 0; }
              .readme-body input[type=checkbox] { margin-right: 6px; }
              .readme-body del { color: ${C.fgd}; }
            `}</style>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  )
}
