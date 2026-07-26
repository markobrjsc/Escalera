import { SortControl } from "./SortControl/SortControl.js";

// The in-game menu panel: hand sorting plus scoreboard / profile / tutorial /
// leave actions.
export function GameMenu({ sort, onSort, onScoreboard, onProfile, onTutorial, onLeave, onClose }: { sort: "rank" | "suit"; onSort: (sort: "rank" | "suit") => void; onScoreboard: () => void; onProfile: () => void; onTutorial: () => void; onLeave: () => void; onClose: () => void }) {
  return <aside className="game-menu surface"><div className="dialog-title"><h2>Spielmenü</h2><button className="button-icon" onClick={onClose}>×</button></div><div className="menu-sort"><span className="hud-kicker">Hand sortieren</span><SortControl sort={sort} onSort={onSort} /></div><button onClick={onScoreboard}>Scoreboard</button><button onClick={onProfile}>Mein Profil</button><button onClick={onTutorial}>Kurzanleitung</button><button className="button-danger leave-game" onClick={onLeave}>Lobby verlassen</button></aside>;
}
