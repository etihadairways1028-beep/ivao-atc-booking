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
        Signed in as <strong>{vid}</strong>
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
      <label htmlFor="vid-input">VID</label>
      <input
        id="vid-input"
        inputMode="numeric"
        pattern="[1-9][0-9]{0,8}"
        placeholder="e.g. 485573"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        required
      />
      <button type="submit">Sign in</button>
    </form>
  )
}
