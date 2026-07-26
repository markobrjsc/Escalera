// Toggle for sorting the hand by rank ("Wert") or suit ("Farbe").
export function SortControl({ sort, onSort }: { sort: "rank" | "suit"; onSort: (sort: "rank" | "suit") => void }) {
  return <div className="sort-control"><button className={sort === "rank" ? "is-active" : ""} aria-pressed={sort === "rank"} onClick={() => onSort("rank")}>Wert</button><button className={sort === "suit" ? "is-active" : ""} aria-pressed={sort === "suit"} onClick={() => onSort("suit")}>Farbe</button></div>;
}
