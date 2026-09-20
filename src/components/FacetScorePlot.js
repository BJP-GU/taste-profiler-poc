import Link from "next/link";

const SCORE_MARKS = [
  { value: -1, label: "Dislike" },
  { value: 0, label: "Neutral" },
  { value: 1, label: "Like" },
];

const THUMB = 36;
const SPLAY_X = 10;
const SPLAY_Y = 7;

function groupByScore(placements, facetKey) {
  const groups = { [-1]: [], 0: [], 1: [] };
  for (const p of placements) {
    const score = p.scores?.[facetKey];
    if (score === -1 || score === 0 || score === 1) groups[score].push(p);
  }
  return groups;
}

function ThumbContent({ item }) {
  if (item.imagePath) {
    return (
      <img
        src={item.imagePath}
        alt=""
        className="h-full w-full object-cover"
        draggable={false}
      />
    );
  }

  const label = item.label || item.hostname || "?";
  const short = label.length > 4 ? label.slice(0, 2).toUpperCase() : label.toUpperCase();
  return (
    <span className="flex h-full w-full items-center justify-center bg-neutral-100 text-[9px] font-medium text-neutral-600 px-0.5 text-center leading-tight">
      {short}
    </span>
  );
}

function ScoreStack({ items, catalogBase }) {
  if (items.length === 0) {
    return <div className="h-12 w-9" aria-hidden />;
  }

  const width = THUMB + Math.max(0, items.length - 1) * SPLAY_X;
  const height = THUMB + Math.max(0, items.length - 1) * SPLAY_Y;

  return (
    <div className="relative" style={{ width, height }}>
      {items.map((item, i) => (
        <Link
          key={item.id}
          href={`${catalogBase}/${item.id}`}
          title="Open reference"
          className="absolute overflow-hidden rounded-sm border border-neutral-300 bg-white shadow-sm hover:border-neutral-700 hover:z-50 transition-colors"
          style={{
            width: THUMB,
            height: THUMB,
            left: i * SPLAY_X,
            bottom: i * SPLAY_Y,
            zIndex: i + 1,
          }}
        >
          <ThumbContent item={item} />
        </Link>
      ))}
    </div>
  );
}

export default function FacetScorePlot({ facets, placements, catalogBase = "/catalog" }) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-neutral-500 leading-relaxed">
        <span className="font-medium text-neutral-700">Note:</span> Facet plots are separate from
        the profile; they only show your raw per-sample scores on each facet scale.
      </p>

      {facets.map((f) => {
        const groups = groupByScore(placements, f.key);
        return (
          <div key={f.key} className="space-y-2">
            <div className="text-sm font-medium">{f.label}</div>
            <div className="relative pt-1 pb-1">
              <div
                className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-neutral-200"
                aria-hidden
              />
              <div className="relative flex items-end justify-between">
                {SCORE_MARKS.map((mark) => (
                  <div
                    key={mark.value}
                    className="flex flex-col items-center gap-2"
                    style={{ width: "33%" }}
                  >
                    <ScoreStack items={groups[mark.value]} catalogBase={catalogBase} />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-between text-[11px] text-neutral-400 px-1">
              {SCORE_MARKS.map((mark) => (
                <span key={mark.value}>{mark.label}</span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
