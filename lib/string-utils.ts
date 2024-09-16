export const countOccurrences = (str_: string, subStr: string) => {
  let occurrenceCount = 0
  let pos = -subStr.length
  while ((pos = str_.indexOf(subStr, pos + subStr.length)) > -1) {
    occurrenceCount++
  }
  return occurrenceCount
}
