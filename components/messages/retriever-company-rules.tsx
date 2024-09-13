import React, { useEffect, useState } from "react"

interface InfoTableProps {
  jsonData: string
}

interface RuleDataJson {
  [key: string]: boolean
}

const InfoTable: React.FC<InfoTableProps> = ({ jsonData }) => {
  const [data, setData] = useState<RuleDataJson | undefined>({})

  useEffect(() => {
    try {
      setData(JSON.parse(jsonData))
    } catch (e) {
      setData(undefined)
    }
  }, [jsonData])

  if (data === undefined) return "Error loading company rules!"

  return (
    <table className="m-0 min-w-full overflow-hidden rounded-b-lg bg-white dark:bg-gray-900">
      <thead className="rounded-md bg-gray-200 text-sm uppercase leading-normal text-gray-600 dark:bg-gray-800 dark:text-gray-300">
        <tr>
          <th className="px-6 py-3 text-left">Rule</th>
          <th className="px-6 py-3 text-center">Result</th>
        </tr>
      </thead>
      <tbody className="text-sm font-light text-gray-600 dark:text-gray-300">
        {Object.keys(data).map((key, index) => (
          <tr
            key={index}
            className="border-b border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800"
          >
            <td className="px-6 py-3 text-left">{key}</td>
            <td
              className={`px-6 py-3 text-center ${
                data[key]
                  ? "text-green-500 dark:text-green-400"
                  : "text-red-500 dark:text-red-400"
              }`}
            >
              {data[key] ? "True" : "False"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default InfoTable
