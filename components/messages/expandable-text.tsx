import React, { useContext, useMemo, useState } from "react"
import { DetailsContext } from "@/components/messages/message-markdown"

interface ExpandableTextProps {
  children: React.ReactNode
  maxChars?: number
}

const ExpandableText: React.FC<ExpandableTextProps> = ({
  children,
  maxChars = 100
}) => {
  const getPlainText = (node: React.ReactNode): string => {
    if (typeof node === "string") {
      return node
    }
    if (React.isValidElement(node)) {
      return getPlainText(node.props.children)
    }
    if (Array.isArray(node)) {
      return node.map(getPlainText).join("")
    }
    return ""
  }

  const [isExpanded, setIsExpanded] = useState(false)
  const isInsideDetails = useContext(DetailsContext)

  const saveTruncationInfo = useMemo(() => {
    return {
      plainText: isInsideDetails ? "" : getPlainText(children)
    }
  }, [children, isInsideDetails])

  const isTruncated = isInsideDetails
    ? false
    : saveTruncationInfo.plainText.length > maxChars

  const truncateText = (
    node: React.ReactNode,
    limit: number
  ): React.ReactNode => {
    let remainingChars = limit

    const recursivelyTruncate = (node: React.ReactNode): React.ReactNode => {
      if (typeof node === "string") {
        // No more characters left to show - empty elements
        if (remainingChars <= 0) return ""
        if (node.length <= remainingChars) {
          // Return full text if it's within the limit
          remainingChars -= node.length
          return node
        } else {
          // Truncate and add ellipsis for the last string
          const truncated = node.slice(0, remainingChars).trimEnd() + "..."
          remainingChars = 0
          return truncated
        }
      }
      if (React.isValidElement(node)) {
        return React.cloneElement(node, {
          // @ts-ignore
          children: React.Children.map(node.props.children, recursivelyTruncate)
        })
      }
      if (Array.isArray(node)) {
        return node.map(recursivelyTruncate)
      }
      return node
    }

    return recursivelyTruncate(node)
  }

  const toggleExpansion = () => {
    setIsExpanded(!isExpanded)
  }

  return (
    <div>
      {isExpanded || !isTruncated ? children : truncateText(children, maxChars)}

      {isTruncated && " "}
      {isTruncated && (
        <button
          onClick={toggleExpansion}
          className="mt-0 text-blue-500 hover:underline"
        >
          {isExpanded ? "Show less" : "Read more"}
        </button>
      )}
    </div>
  )
}

export default ExpandableText
