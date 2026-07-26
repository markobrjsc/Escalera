// Search field + create button above the lobby browser.
export function LobbyToolbar({ search, setSearch, onSearch, onCreate }: { search: string; setSearch: (value: string) => void; onSearch: () => void; onCreate: () => void }) {
  return <form className="lobby-tools" data-tutorial-target="lobby-tools" onSubmit={(event) => { event.preventDefault(); onSearch(); }}>
    <input aria-label="Lobbys durchsuchen" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Lobbyname …" />
    <button className="button-icon" aria-label="Suchen">⌕</button>
    <button type="button" className="button-primary create-button" data-audio="open" aria-label="Lobby erstellen" onClick={onCreate}>+</button>
  </form>;
}
