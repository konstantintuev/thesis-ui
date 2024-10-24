import React, { useContext, useMemo, useState } from "react"
import {DetailsContext} from "@/components/messages/expandable-details";

interface ExpandableTextProps {
  children: React.ReactNode
  maxChars?: number
  openItems: {
    [key: string]: boolean
  }
}

export const getPlainText = (node: React.ReactNode): string => {
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

// Thank you https://gist.github.com/jlevy/c246006675becc446360a798e2b2d781
export const simpleHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
  }
  // Convert to 32bit unsigned integer in base 36 and pad with "0" to ensure length is 7.
  return (hash >>> 0).toString(36).padStart(7, '0');
};

const ExpandableText: React.FC<ExpandableTextProps> = ({
  children,
  openItems,
  maxChars = 112
}) => {

  const [isExpanded, setIsExpanded] = useState(false)
  const isInsideDetails = useContext(DetailsContext)

  const saveTruncationInfo = useMemo(() => {
    const text = isInsideDetails ? "" : getPlainText(children)
    return {
      plainText: text,
      key: simpleHash(text)
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
    openItems[saveTruncationInfo.key] = !openItems[saveTruncationInfo.key]
    setIsExpanded(!isExpanded)
  }

  return (
    <div>
      {openItems[saveTruncationInfo.key] || !isTruncated ? children : truncateText(children, maxChars)}

      {isTruncated && " "}
      {isTruncated && (
        <button
          onClick={toggleExpansion}
          className="mt-0 text-blue-500 hover:underline"
        >
          {openItems[saveTruncationInfo.key] ? "Show less" : "Read more"}
        </button>
      )}
    </div>
  )
}

export default ExpandableText
