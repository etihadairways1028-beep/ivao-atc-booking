import { useState, type FormEvent } from 'react'

type Props = {
  vid: string
  onChange: (vid: string) => void
}

export function VidLogin({ vid, onChange }: Props) {
  const [input, setInput] = useState('')

  if (vid) {
    return (
      <div className="vid">
        <span className="avatar" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4 3.6-6 8-6s8 2 8 6z" />
          </svg>
        </span>
        <strong>{vid}</strong>
        <button type="button" onClick={() => onChange('')}>
          Sign out
        </button>
      </div>
    )
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    onChange(input.trim())
    setInput('')
  }

  return (
    <form className="vid" onSubmit={handleSubmit}>
      <label htmlFor="vid-input" className="sr-only">
        VID
      </label>
      <input
        id="vid-input"
        inputMode="numeric"
        pattern="[1-9][0-9]{0,8}"
        placeholder="Your VID"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        required
      />
      <button type="submit" className="primary">
        Sign in
      </button>
    </form>
  )
}
