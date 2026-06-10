import { useState } from 'react'
import { motion } from 'framer-motion'
import { User, Bot, Copy, Check, RotateCcw, Edit2, FileText, ExternalLink, Download } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import type { ChatMessage } from '@/types'

interface MessageBubbleProps {
  msg: ChatMessage
  isLatest?: boolean
  onRegenerate?: () => void
  onEdit?: (content: string) => void
}

const CodeBlock = ({ language, children }: { language: string, children: string }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(children)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative group/code my-4 rounded-xl overflow-hidden border border-jarvis-border/50">
      <div className="flex items-center justify-between px-4 py-2 bg-jarvis-bg-2 border-b border-jarvis-border/30">
        <span className="text-[10px] font-mono text-jarvis-text-3 uppercase tracking-widest">{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[10px] font-mono text-jarvis-text-3 hover:text-jarvis-primary transition-colors"
          aria-label="Copy code block"
        >
          {copied ? (
            <>
              <Check size={12} className="text-jarvis-secondary" />
              <span className="text-jarvis-secondary">Copied!</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <SyntaxHighlighter
        style={atomDark}
        language={language}
        PreTag="div"
        customStyle={{
          margin: 0,
          padding: '1rem',
          fontSize: '0.85rem',
          lineHeight: '1.5',
          backgroundColor: '#0d1526'
        }}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  )
}

export default function MessageBubble({ msg, isLatest, onRegenerate, onEdit }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(msg.content)
  const isUser = msg.role === 'user'

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleEditSubmit = () => {
    if (onEdit && editContent.trim() !== msg.content) {
      onEdit(editContent)
    }
    setIsEditing(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
      role="log"
      aria-label={`${isUser ? 'Your' : 'AI'} message`}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          isUser
            ? 'bg-gradient-to-br from-jarvis-primary to-jarvis-secondary'
            : 'border border-jarvis-border'
        }`}
          style={!isUser ? { background: 'rgba(0,212,255,0.1)' } : {}}
        >
          {isUser ? <User size={14} className="text-jarvis-bg" /> : <Bot size={14} className="text-jarvis-primary" />}
        </div>
      </div>

      {/* Bubble */}
      <div className={`group relative max-w-[85%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        <div className={`px-4 py-3 text-sm leading-relaxed overflow-hidden ${isUser ? 'chat-bubble-user text-jarvis-text' : 'chat-bubble-ai text-jarvis-text'}`}>
          {isEditing ? (
            <div className="flex flex-col gap-2 min-w-[300px]">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="bg-transparent border border-jarvis-primary/30 rounded p-2 text-sm focus:outline-none focus:border-jarvis-primary w-full min-h-[100px] resize-none text-white"
                autoFocus
                aria-label="Edit message"
              />
              <div className="flex justify-end gap-2">
                <button 
                  onClick={() => setIsEditing(false)} 
                  className="text-[10px] text-jarvis-text-3 hover:text-jarvis-text uppercase tracking-widest font-mono"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleEditSubmit} 
                  className="text-[10px] text-jarvis-primary font-bold uppercase tracking-widest font-mono bg-jarvis-primary/10 px-2 py-1 rounded border border-jarvis-primary/20"
                >
                  Save & Submit
                </button>
              </div>
            </div>
          ) : (
            <div className="markdown-content">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ node, inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '')
                    return !inline && match ? (
                      <CodeBlock language={match[1]}>{String(children).replace(/\n$/, '')}</CodeBlock>
                    ) : (
                      <code className="bg-jarvis-bg-2 px-1.5 py-0.5 rounded text-jarvis-secondary font-mono text-[0.85em] border border-jarvis-border/30" {...props}>
                        {children}
                      </code>
                    )
                  },
                  img({ src, alt }) {
                    return (
                      <div className="my-4 rounded-xl overflow-hidden border border-jarvis-border/50 group/img relative">
                        <img 
                          src={src?.startsWith('/') ? `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${src}` : src} 
                          alt={alt} 
                          className="max-w-full h-auto cursor-zoom-in hover:opacity-90 transition-opacity" 
                          onClick={() => window.open(src?.startsWith('/') ? `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${src}` : src, '_blank')}
                        />
                        <div className="absolute top-2 right-2 opacity-0 group-hover/img:opacity-100 transition-opacity">
                           <a 
                             href={src?.startsWith('/') ? `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${src}` : src} 
                             target="_blank" 
                             rel="noreferrer"
                             className="p-1.5 bg-black/50 backdrop-blur-md rounded-lg text-white hover:text-jarvis-primary transition-colors inline-block"
                           >
                             <ExternalLink size={14} />
                           </a>
                        </div>
                      </div>
                    )
                  },
                  a({ href, children }) {
                    // Check if it's a file link (from our system)
                    const isFile = href?.includes('/api/chat/files/')
                    if (isFile) {
                       return (
                         <div className="inline-flex items-center gap-2 p-2 my-1 bg-jarvis-bg-2 border border-jarvis-border/30 rounded-lg hover:border-jarvis-primary/50 transition-all group/file">
                           <div className="w-8 h-8 rounded bg-jarvis-primary/10 flex items-center justify-center text-jarvis-primary">
                             <FileText size={16} />
                           </div>
                           <div className="flex flex-col min-w-0">
                             <span className="text-xs font-medium truncate text-jarvis-text max-w-[200px]">{children}</span>
                             <span className="text-[10px] text-jarvis-text-3 font-mono">Attachment</span>
                           </div>
                           <a 
                             href={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${href}`} 
                             download
                             className="ml-2 p-1.5 text-jarvis-text-3 hover:text-jarvis-primary transition-colors"
                           >
                             <Download size={14} />
                           </a>
                         </div>
                       )
                    }
                    return <a href={href} className="text-jarvis-primary hover:underline decoration-jarvis-primary/30" target="_blank" rel="noreferrer">{children}</a>
                  }
                }}
              >
                {msg.content || (isLatest ? '▋' : '')}
              </ReactMarkdown>
            </div>
          )}
        </div>
        
        <div className={`flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity ${isUser ? 'flex-row-reverse' : ''}`}>
          <span className="text-[10px] text-jarvis-text-3 font-mono">
            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          
          <div className="flex items-center gap-1 bg-jarvis-bg-2/50 backdrop-blur-sm px-2 py-1 rounded-full border border-jarvis-border/20 shadow-lg">
            <button 
              onClick={handleCopy} 
              className="p-1 text-jarvis-text-3 hover:text-jarvis-primary transition-colors" 
              title="Copy message"
              aria-label="Copy message text"
            >
              {copied ? <Check size={12} className="text-jarvis-secondary" /> : <Copy size={12} />}
            </button>

            {isUser && onEdit && (
              <button 
                onClick={() => setIsEditing(true)} 
                className="p-1 text-jarvis-text-3 hover:text-jarvis-primary transition-colors" 
                title="Edit message"
                aria-label="Edit message"
              >
                <Edit2 size={12} />
              </button>
            )}

            {!isUser && onRegenerate && (
              <button 
                onClick={onRegenerate} 
                className="p-1 text-jarvis-text-3 hover:text-jarvis-primary transition-colors" 
                title="Regenerate response"
                aria-label="Regenerate response"
              >
                <RotateCcw size={12} />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

