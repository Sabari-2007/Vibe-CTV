'use client'

const GENRE_OPTIONS = ['Sports', 'News', 'Movies', 'Entertainment', 'Comedy', 'Drama']
const LOCATION_OPTIONS = [
  'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix',
  'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose',
]

interface StepTwoProps {
  genres: string[]
  locations: string[]
  onToggleGenre: (g: string) => void
  onToggleLocation: (l: string) => void
}

function Chip({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border ${
        selected
          ? 'bg-accent-light text-accent border-accent/30'
          : 'bg-white text-ink-light border-muted hover:border-accent/20 hover:text-ink'
      }`}
    >
      {label}
    </button>
  )
}

export function StepTwo({
  genres,
  locations,
  onToggleGenre,
  onToggleLocation,
}: StepTwoProps) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-ink mb-1">Targeting</h2>
        <p className="text-ink-light text-sm">
          Select genres and locations for your campaign.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-ink mb-3">
          Content Genres
        </label>
        <div className="flex flex-wrap gap-2">
          {GENRE_OPTIONS.map((g) => (
            <Chip
              key={g}
              label={g}
              selected={genres.includes(g)}
              onClick={() => onToggleGenre(g)}
            />
          ))}
        </div>
        {genres.length === 0 && (
          <p className="text-xs text-ink-light/50 mt-2">
            No genres selected — campaign will target all genres.
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-ink mb-3">
          Locations
        </label>
        <div className="flex flex-wrap gap-2">
          {LOCATION_OPTIONS.map((l) => (
            <Chip
              key={l}
              label={l}
              selected={locations.includes(l)}
              onClick={() => onToggleLocation(l)}
            />
          ))}
        </div>
        {locations.length === 0 && (
          <p className="text-xs text-ink-light/50 mt-2">
            No locations selected — campaign will target all locations.
          </p>
        )}
      </div>
    </div>
  )
}
