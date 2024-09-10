import React, { FC } from "react"
import remarkGfm from "remark-gfm"
import rehypeKatex from "rehype-katex"
import remarkMath from "remark-math"
import rehypeRaw from "rehype-raw"
import "katex/dist/katex.min.css" // `rehype-katex` does not import the CSS for you
import { MessageCodeBlock } from "./message-codeblock"
import { MessageMarkdownMemoized } from "./message-markdown-memoized"
import { jsonStringToRetrieverMessageFileHeader } from "@/components/messages/retriever-message-file-header"

interface MessageMarkdownProps {
  content: string
}

export const MessageMarkdown: FC<MessageMarkdownProps> = ({ content }) => {
  return (
    <MessageMarkdownMemoized
      className="prose dark:prose-invert prose-p:leading-relaxed prose-pre:p-0 min-w-full space-y-6 break-words"
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex, rehypeRaw]}
      components={{
        p({ children }) {
          return <p className="mb-2 last:mb-0">{children}</p>
        },
        img({ node, ...props }) {
          return <img className="max-w-[67%]" {...props} />
        },
        pre({ node, className, children, ...props }) {
          let chatFileMetadata = ""
          if (
            node?.children.some(child => {
              if (
                child.type === "element" &&
                child.tagName === "code" &&
                child.properties.className &&
                Array.isArray(child.properties.className) &&
                child.properties.className.length > 0
              ) {
                const match = /language-(\w+)/.exec(
                  `${child.properties.className[0] ?? ""}`
                )
                if (((match && match[1]) || "") === "chatfilemetadata") {
                  chatFileMetadata = child.children
                    .map(childer =>
                      childer.type === "text" ? childer.value : ""
                    )
                    .join("\n")
                  return true
                }
              }
            })
          ) {
            return jsonStringToRetrieverMessageFileHeader(chatFileMetadata)
          }
          return (
            <pre className={className} {...props}>
              {children}
            </pre>
          )
        },
        code({ node, className, children, ...props }) {
          const childArray = React.Children.toArray(children)
          const firstChild = childArray[0] as React.ReactElement
          const firstChildAsString = React.isValidElement(firstChild)
            ? (firstChild as React.ReactElement).props.children
            : firstChild

          if (firstChildAsString === "▍") {
            return <span className="mt-1 animate-pulse cursor-default">▍</span>
          }

          if (typeof firstChildAsString === "string") {
            childArray[0] = firstChildAsString.replace("`▍`", "▍")
          }

          const match = /language-(\w+)/.exec(className || "")

          if (
            typeof firstChildAsString === "string" &&
            !firstChildAsString.includes("\n")
          ) {
            return (
              <code className={className} {...props}>
                {childArray}
              </code>
            )
          }

          return (
            <MessageCodeBlock
              key={Math.random()}
              language={(match && match[1]) || ""}
              value={String(childArray).replace(/\n$/, "")}
              {...props}
            />
          )
        }
      }}
    >
      {content}
    </MessageMarkdownMemoized>
  )
}
