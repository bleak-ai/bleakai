import * as React from "react"

import { cn } from "@/lib/utils"

interface CheckboxProps {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  className?: string
  id?: string
}

function Checkbox({
  checked = false,
  onCheckedChange,
  disabled = false,
  className,
  id,
  ...props
}: CheckboxProps) {
  const [internalChecked, setInternalChecked] = React.useState(checked)

  const isChecked = checked !== undefined ? checked : internalChecked

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newChecked = event.target.checked
    if (onCheckedChange) {
      onCheckedChange(newChecked)
    } else {
      setInternalChecked(newChecked)
    }
  }

  return (
    <input
      type="checkbox"
      id={id}
      checked={isChecked}
      onChange={handleChange}
      disabled={disabled}
      className={cn(
        "h-4 w-4 rounded border border-gray-300 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Checkbox }