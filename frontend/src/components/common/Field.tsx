import type { ReactNode } from 'react'
import { EyeSlash } from '@phosphor-icons/react'

export function Field({
  label,
  placeholder,
  helper,
  icon,
  password,
  value,
  onChange,
}: {
  label: string
  placeholder?: string
  helper?: string
  icon?: ReactNode
  password?: boolean
  value?: string
  onChange?: (value: string) => void
}) {
  return (
    <label className="field">
      {label}
      <span>
        {icon}
        <input
          type={password ? 'password' : 'text'}
          placeholder={placeholder}
          value={value ?? ''}
          onChange={(event) => onChange?.(event.target.value)}
        />
        {password ? <EyeSlash size={18} /> : null}
      </span>
      {helper ? <small>{helper}</small> : null}
    </label>
  )
}
