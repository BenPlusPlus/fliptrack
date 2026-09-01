import { clientEntry, ref, type Handle } from 'remix/ui'

import { localToday } from '../../utils/calendar.ts'

export type DateInputProps = {
  id?: string
  name: string
  required?: boolean
  defaultValue?: string
  defaultToToday?: boolean
}

export const DateInput = clientEntry(
  `${import.meta.url}#DateInput`,
  function DateInput(handle: Handle<DateInputProps>) {
    return () => {
      let { id, name, required, defaultValue, defaultToToday } = handle.props
      return (
        <input
          id={id}
          type="date"
          name={name}
          required={required}
          defaultValue={defaultValue ?? ''}
          mix={
            defaultToToday
              ? ref((node) => {
                  if (!(node instanceof HTMLInputElement) || node.value) return
                  node.value = localToday()
                })
              : undefined
          }
        />
      )
    }
  },
)
