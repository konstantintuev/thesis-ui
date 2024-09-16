import React, { useEffect, useState } from "react"
import { RuleComparisonResults } from "@/types/retriever"
import { WithTooltip } from "@/components/ui/with-tooltip"

interface InfoTableProps {
  jsonData: string
}

const InfoTable: React.FC<InfoTableProps> = ({ jsonData }) => {
  const [data, setData] = useState<RuleComparisonResults | undefined>({})

  useEffect(() => {
    try {
      setData(JSON.parse(jsonData))
    } catch (e) {
      setData(undefined)
    }
  }, [jsonData])

  if (data === undefined) return "Error loading company rules!"

  return (
    <table className="m-0 w-full overflow-hidden rounded-b-lg bg-white dark:bg-gray-900">
      <thead className="rounded-md bg-gray-200 text-sm uppercase leading-normal text-gray-600 dark:bg-gray-800 dark:text-gray-300">
        <tr>
          <th className="px-6 py-3 text-left">Rule</th>
          <th className="px-6 py-3 text-center">Result</th>
        </tr>
      </thead>
      <tbody className="w-full text-sm font-light text-gray-600 dark:text-gray-300">
        {Object.entries(data).map(([key, value], index) => (
          <tr
            key={index}
            className="w-full border-b border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800 "
          >
            <td className="w-full p-0 text-left">
              <WithTooltip
                key={index}
                delayDuration={0}
                side="top"
                triggerClass={"w-full"}
                display={
                  value.explanation && (
                    <div className="max-w-xl whitespace-pre-wrap break-words">
                      {value.explanation}
                    </div>
                  )
                }
                trigger={
                  <div className="w-full px-6 py-3 text-left">{key}</div>
                }
              />
            </td>
            <td
              className={`px-6 py-3 text-center ${
                value.score
                  ? "text-green-500 dark:text-green-400"
                  : "text-red-500 dark:text-red-400"
              }`}
            >
              {value.score ? "True" : "False"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default InfoTable
