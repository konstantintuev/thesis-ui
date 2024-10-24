import React, {createContext, SyntheticEvent, useContext, useEffect, useMemo, useRef, useState} from "react"
import {getPlainText, simpleHash} from "@/components/messages/expandable-text";

interface ExpandableTextProps {
  children: React.ReactNode
  openItems: {
    [key: string]: boolean
  }
  id?: string
}

export const DetailsContext = createContext(false)

const ExpandableDetails: React.FC<ExpandableTextProps> = ({
                                                         children,
                                                         id,
                                                         openItems
                                                       }) => {

  const [updateDetails, setUpdateDetails] = useState("")

  const saveTruncationInfo = useMemo(() => {
    const text = id ?? getPlainText(children)
    const key = id ?? simpleHash(text)
    return {
      plainText: text,
      key: key
    }
  }, [children])

  const toggleExpansion = (e: SyntheticEvent) => {
    e.preventDefault()
    openItems[saveTruncationInfo.key] = !openItems[saveTruncationInfo.key]
    setUpdateDetails(crypto.randomUUID())
  }

  const detailsRef = useRef<HTMLDetailsElement>(null)

  useEffect(() => {
    const detailsElement = detailsRef.current

    if (detailsElement) {
      const handleClick = (event: any) => {
        const summaryElement = detailsElement.querySelector('summary')

        if (!summaryElement) return

        const target = event.target

        if (summaryElement.contains(target)) {
          toggleExpansion(event)
        }
      }

      detailsElement.addEventListener('click', handleClick)

      return () => {
        detailsElement.removeEventListener('click', handleClick)
      }
    }
  }, [detailsRef])

  return (
    <DetailsContext.Provider value={true}>
      <details
        // @ts-ignore
        addtionalvalue={updateDetails}
        open={openItems[saveTruncationInfo.key]}
        ref={detailsRef}
      >
        {children}
      </details>
    </DetailsContext.Provider>
  )
}

export default ExpandableDetails
