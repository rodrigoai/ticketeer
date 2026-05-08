const padDateTimeSegment = (value) => String(value).padStart(2, '0')

export const formatDateTimeLocalInput = (value) => {
  if (!value) return ''

  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return `${date.getFullYear()}-${padDateTimeSegment(date.getMonth() + 1)}-${padDateTimeSegment(date.getDate())}T${padDateTimeSegment(date.getHours())}:${padDateTimeSegment(date.getMinutes())}`
}

export const serializeDateTimeLocalInput = (value) => {
  if (!value) return ''

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toISOString()
}
