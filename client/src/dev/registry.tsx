import { useState, type ReactNode } from "react";
import { buildScoreboardRows } from "../scoreboard.js";
import { Avatar } from "../components/Avatar/Avatar.js";
import { Badge } from "../components/Badge/Badge.js";
import { Brand } from "../components/Brand/Brand.js";
import { Connection } from "../components/Connection/Connection.js";
import { Orientation } from "../components/Orientation/Orientation.js";
import { SignalIcon } from "../components/GameStatusBar/SignalIcon/SignalIcon.js";
import { GameStatusBar } from "../components/GameStatusBar/GameStatusBar.js";
import { PlayerStatLabels } from "../components/PlayerStatLabels/PlayerStatLabels.js";
import { EmptyState } from "../components/EmptyState/EmptyState.js";
import { ConfirmationDialog } from "../components/ConfirmationDialog/ConfirmationDialog.js";
import { VoiceStatus } from "../components/VoiceStatus/VoiceStatus.js";
import { AchievementToasts } from "../components/AchievementToasts/AchievementToasts.js";
import { AppHeader } from "../components/AppHeader/AppHeader.js";
import { CardFace } from "../components/CardFace/CardFace.js";
import { PileStack } from "../components/PileStack/PileStack.js";
import { AccessView } from "../components/AccessView/AccessView.js";
import { LoginCard } from "../components/AccessView/LoginCard/LoginCard.js";
import { LobbyListView } from "../components/LobbyListView/LobbyListView.js";
import { LobbyToolbar } from "../components/LobbyListView/LobbyToolbar/LobbyToolbar.js";
import { LobbyCard } from "../components/LobbyListView/LobbyBrowser/LobbyCard/LobbyCard.js";
import { LobbyBrowser } from "../components/LobbyListView/LobbyBrowser/LobbyBrowser.js";
import { LobbySettingsDialog } from "../components/LobbySettingsDialog/LobbySettingsDialog.js";
import { SettingBadges } from "../components/LobbyView/SettingBadges/SettingBadges.js";
import { LobbyView } from "../components/LobbyView/LobbyView.js";
import { MembersPanel } from "../components/LobbyView/MembersPanel/MembersPanel.js";
import { MemberCard } from "../components/LobbyView/MembersPanel/MemberCard/MemberCard.js";
import { MemberSlotEmpty } from "../components/LobbyView/MembersPanel/MemberSlotEmpty/MemberSlotEmpty.js";
import { TurnCountdown } from "../components/GameView/GameHud/TurnCountdown/TurnCountdown.js";
import { PhaseHud } from "../components/GameView/GameHud/PhaseHud/PhaseHud.js";
import { GameHud } from "../components/GameView/GameHud/GameHud.js";
import { TurnOrder } from "../components/GameView/GameHud/TurnOrder/TurnOrder.js";
import { TurnOrderPlayer } from "../components/GameView/GameHud/TurnOrder/TurnOrderPlayer/TurnOrderPlayer.js";
import { ActivePlayerHud } from "../components/GameView/GameHud/ActivePlayerHud/ActivePlayerHud.js";
import { GameView } from "../components/GameView/GameView.js";
import { GameBoard } from "../components/GameView/GameBoard/GameBoard.js";
import { PileStation } from "../components/GameView/GameBoard/PileStation/PileStation.js";
import { MeldZone } from "../components/GameView/GameBoard/MeldZone/MeldZone.js";
import { MeldCard } from "../components/GameView/GameBoard/MeldZone/MeldCard/MeldCard.js";
import { MeldSlotEmpty } from "../components/GameView/GameBoard/MeldZone/MeldSlotEmpty/MeldSlotEmpty.js";
import { PlayingCard } from "../components/GameView/PlayerHand/PlayingCard/PlayingCard.js";
import { PlayerHand } from "../components/GameView/PlayerHand/PlayerHand.js";
import { BuyButton } from "../components/GameView/BuyButton/BuyButton.js";
import { GameEvents } from "../components/GameView/GameEvents/GameEvents.js";
import { GameMenu } from "../components/GameView/GameMenu/GameMenu.js";
import { SortControl } from "../components/GameView/GameMenu/SortControl/SortControl.js";
import { DragGhost } from "../components/GameView/DragGhost/DragGhost.js";
import { FlightLayer } from "../components/FlightLayer/FlightLayer.js";
import { SlideStage } from "../components/SlideStage/SlideStage.js";
import { MatchStartOverlay } from "../components/MatchStartOverlay/MatchStartOverlay.js";
import { DealStage } from "../components/DealStage/DealStage.js";
import { Scoreboard } from "../components/results/Scoreboard/Scoreboard.js";
import { ScoreHistory } from "../components/results/Scoreboard/ScoreHistory/ScoreHistory.js";
import { RoundResultOverlay } from "../components/results/RoundResultOverlay/RoundResultOverlay.js";
import { FinalResultOverlay } from "../components/results/FinalResultOverlay/FinalResultOverlay.js";
import { ProfileSummary } from "../components/ProfileDialog/ProfileSummary/ProfileSummary.js";
import { ProfileDialog } from "../components/ProfileDialog/ProfileDialog.js";
import { AvatarEditor } from "../components/ProfileDialog/AvatarEditor/AvatarEditor.js";
import { AudioSettingsPanel } from "../components/ProfileDialog/AudioSettingsPanel/AudioSettingsPanel.js";
import { AchievementTreeOverlay } from "../components/AchievementTreeOverlay/AchievementTreeOverlay.js";
import { AchievementTile } from "../components/AchievementTreeOverlay/AchievementTile/AchievementTile.js";
import { AchievementTooltip } from "../components/AchievementTreeOverlay/AchievementTooltip/AchievementTooltip.js";
import { PlayerInteractionCard } from "../components/PlayerInteractionCard/PlayerInteractionCard.js";
import { PlayerVoiceControls } from "../components/PlayerInteractionCard/PlayerVoiceControls/PlayerVoiceControls.js";
import { TutorialDialog } from "../components/TutorialDialog/TutorialDialog.js";
import { TutorialProgress } from "../components/TutorialDialog/TutorialProgress/TutorialProgress.js";
import { TutorialChapterBody } from "../components/TutorialDialog/TutorialChapterBody/TutorialChapterBody.js";
import { TutorialFeed } from "../components/TutorialDialog/TutorialFeed/TutorialFeed.js";
import { TUTORIAL_CHAPTERS } from "../components/TutorialDialog/tutorial-content.js";
import { PanZoom } from "../components/PanZoom/PanZoom.js";
import { PileDesignView } from "../components/PileDesignView/PileDesignView.js";
import { demoCards, demoMeld, demoPlacements, demoProfile, demoRoundResult, demoTree, makeGame, makeLobby, makeUser, makeVoice } from "./fixtures.js";

export type Preview = { id: string; title: string; group: string; full?: boolean; render: () => ReactNode };

const noop = () => undefined;
const asyncNoop = async () => undefined;
const lobby = makeLobby();
const activeLobby = { ...lobby, status: "ACTIVE" as const };
const user = makeUser();
const gameUser = activeLobby.players[0].user;
const gameFixture = makeGame();
const activeGame = { ...gameFixture, state: { ...gameFixture.state, lastRoundResult: null } };
const gameSeats = activeGame.state.players.map((player) => {
  const member = activeLobby.players.find((entry) => entry.user.id === player.userId);
  return { ...player, user: member?.user ?? user, connected: member?.connected ?? false };
});
const activeSeat = gameSeats.find((player) => player.userId === activeGame.state.activePlayerId) ?? gameSeats[0];
const waitingSeats = gameSeats.filter((player) => player.userId !== activeSeat.userId);
const scoreRows = buildScoreboardRows(activeGame.state.roundResults, activeGame.state.players);
const achievementPlacement = { branch: demoTree[0], node: demoTree[0].nodes[0], index: 0, x: 110, y: 110 };

function State({ label, children }: { label: string; children: ReactNode }) {
  return <div className="dev-state"><span className="dev-state-label">{label}</span><div className="dev-state-body">{children}</div></div>;
}
function Board({ children }: { children: ReactNode }) {
  return <section className="game-board dev-board">{children}</section>;
}
function SlideStagePreview() {
  const [view, setView] = useState<"access" | "list">("access");
  return <div className="dev-slide-preview">
    <button type="button" onClick={() => setView((current) => current === "access" ? "list" : "access")}>Ansicht wechseln</button>
    <SlideStage viewKey={view}><section className="surface dev-slide-card"><strong>{view === "access" ? "Access" : "Lobby-Liste"}</strong></section></SlideStage>
  </div>;
}

function VoiceStatusPreview() {
  const [selfMuted, setSelfMuted] = useState(false);
  const gameVoice = makeVoice({ selfMuted, toggleSelfMuted: () => setSelfMuted((current) => !current) });
  return <>
    <State label="verbunden (Lobby)"><VoiceStatus voice={makeVoice()} variant="lobby" /></State>
    <State label="nur hören (Lobby)"><VoiceStatus voice={makeVoice({ status: "listen-only", canSelfMute: false, notice: "Mikrofon nicht freigegeben" })} variant="lobby" /></State>
    <State label="Mikro an/aus (Game, klickbar)"><VoiceStatus voice={gameVoice} variant="game" /></State>
    <State label="verbindet (Game)"><VoiceStatus voice={makeVoice({ status: "requesting", canSelfMute: false })} variant="game" /></State>
    <State label="nicht verbunden (Game)"><VoiceStatus voice={makeVoice({ status: "idle", canSelfMute: false })} variant="game" /></State>
    <State label="nur hören (Game)"><VoiceStatus voice={makeVoice({ status: "listen-only", canSelfMute: false, notice: "Mikrofon nicht freigegeben" })} variant="game" /></State>
    <State label="nicht unterstützt (Game)"><VoiceStatus voice={makeVoice({ status: "unsupported", canSelfMute: false })} variant="game" /></State>
  </>;
}

function PhaseHudPreview() {
  return <>
    {Array.from({ length: 7 }, (_, index) => {
      const phase = index + 1;
      return <State label={`Phase ${phase}`} key={phase}>
        <div style={{ position: "relative", width: "min(100%, 30rem)", minHeight: "6rem" }}>
          <PhaseHud round={phase} phase={phase} phaseLaid={phase === 3} />
        </div>
      </State>;
    })}
  </>;
}

export const previews: Preview[] = [
  // ---- Geteilte Bausteine ----
  { id: "Brand", title: "Brand", group: "Geteilt", render: () => <><State label="full"><Brand /></State><State label="compact"><Brand variant="compact" /></State></> },
  { id: "Avatar", title: "Avatar", group: "Geteilt", render: () => <><State label="Initiale"><Avatar user={makeUser({ username: "Marko" })} /></State><State label="groß"><Avatar user={makeUser({ username: "Sara" })} large /></State><State label="klickbar"><Avatar user={user} onClick={noop} /></State></> },
  { id: "Connection", title: "Connection", group: "Geteilt", render: () => <><State label="online"><Connection connected /></State><State label="offline"><Connection connected={false} /></State></> },
  { id: "SignalIcon", title: "SignalIcon", group: "Geteilt", render: () => <><State label="online"><SignalIcon online /></State><State label="offline"><SignalIcon online={false} /></State></> },
  { id: "GameStatusBar", title: "GameStatusBar", group: "Geteilt", render: () => <><State label="verbunden"><GameStatusBar connected /></State><State label="unterbrochen"><GameStatusBar connected={false} /></State></> },
  { id: "PlayerStatLabels", title: "PlayerStatLabels", group: "Geteilt", render: () => <><State label="ohne Strafe"><PlayerStatLabels coins={5} cards={7} /></State><State label="mit Strafe"><PlayerStatLabels coins={2} cards={11} penalty={40} /></State></> },
  { id: "EmptyState", title: "EmptyState", group: "Geteilt", render: () => <><State label="leer"><EmptyState title="Noch keine Lobby offen." hint="Erstelle die erste Runde." /></State><State label="Ladezustand"><EmptyState className="lobby-loading" role="status" title="Lobbys werden gemischt …" hint="Einen Moment bitte." /></State></> },
  { id: "VoiceStatus", title: "VoiceStatus", group: "Geteilt", render: () => <VoiceStatusPreview /> },
  { id: "AppHeader", title: "AppHeader", group: "Geteilt", render: () => <AppHeader user={user} leftLabel="Abmelden" leftAudio="close" onLeft={noop} onProfile={noop} profileAudio="open" /> },
  { id: "Badge", title: "Badge", group: "Geteilt", render: () => <><State label="Zähler"><Badge>4 Spieler</Badge></State><State label="Meta"><Badge>AB12</Badge></State></> },
  { id: "Orientation", title: "Orientation", group: "Geteilt", render: () => <div className="dev-orientation-preview"><Orientation landscape /></div> },

  // ---- Karten & Stapel ----
  { id: "CardFace", title: "CardFace", group: "Karten", render: () => <Board><div className="meld-cards" style={{ "--meld-count": 3 } as React.CSSProperties}>{demoCards.slice(0, 3).map((card) => <CardFace card={card} key={card.id} />)}</div></Board> },
  { id: "PileStack", title: "PileStack", group: "Karten", render: () => <Board><div className="pile-station"><div className="pile-slot"><span className="game-pile draw-pile"><PileStack count={86} top={null} kind="draw" /></span></div><span>Ziehstapel <b>[ 86 ]</b></span></div><div className="pile-station"><div className="pile-slot"><span className="game-pile discard-pile"><PileStack count={7} top={demoCards[0]} kind="discard" /></span></div><span>Ablage <b>[ 7 ]</b></span></div></Board> },
  { id: "PileStation", title: "PileStation", group: "Karten", render: () => <Board><PileStation zoneClassName="" buttonRef={noop} buttonClassName="game-pile draw-pile" ariaLabel="Ziehstapel" stackCount={54} stackTop={null} kind="draw" label="Ziehstapel" count={54} /><PileStation zoneClassName="is-target" buttonRef={noop} buttonClassName="game-pile discard-pile" ariaLabel="Ablage" stackCount={6} stackTop={demoCards[1]} kind="discard" label="Ablage" count={6} /></Board> },
  { id: "MeldCard", title: "MeldCard", group: "Karten", render: () => <Board><div className="meld-zone"><MeldCard meld={demoMeld} isTarget={false} cardRef={noop} onActivate={noop} arrivals={{}} /><MeldCard meld={{ ...demoMeld, id: "m2", type: "group", cards: [demoCards[3], demoCards[4]] }} isTarget cardRef={noop} onActivate={noop} arrivals={{}} /></div></Board> },
  { id: "MeldSlotEmpty", title: "MeldSlotEmpty", group: "Karten", render: () => <><State label="frei"><Board><div className="meld-zone"><MeldSlotEmpty /><MeldSlotEmpty /></div></Board></State><State label="auslegbar"><Board><div className="meld-zone is-target"><MeldSlotEmpty /><MeldSlotEmpty /></div></Board></State></> },
  { id: "MeldZone", title: "MeldZone", group: "Karten", render: () => <><State label="mit Meld (ungerade → 5 freie Plätze)"><Board><MeldZone melds={[demoMeld]} openMelds={[]} zoneClassName="" zoneRef={noop} onZoneClick={noop} meldRef={() => noop} onMeldActivate={noop} arrivals={{}} /></Board></State><State label="leer (gerade → 4 freie Plätze)"><Board><MeldZone melds={[]} openMelds={[]} zoneClassName="" zoneRef={noop} onZoneClick={noop} meldRef={() => noop} onMeldActivate={noop} arrivals={{}} /></Board></State></> },
  { id: "PlayingCard", title: "PlayingCard", group: "Karten", render: () => <section className="player-hand"><div className="hand-cards">{demoCards.map((card, index) => <PlayingCard key={card.id} card={card} index={index} count={demoCards.length} selected={index === 2} dragged={false} incoming={false} onPointerDown={() => noop} onClick={noop} />)}</div></section> },
  { id: "DragGhost", title: "DragGhost", group: "Karten", render: () => <DragGhost drag={{ x: 120, y: 120 }} card={demoCards[0]} /> },
  { id: "FlightLayer", title: "FlightLayer", group: "Karten", render: () => <div style={{ position: "relative", minHeight: 240 }}><FlightLayer flights={[{ key: "demo-flight", face: "/cards/7H.svg", from: { left: 32, top: 52, width: 70, height: 98 }, to: { left: 220, top: 118, width: 90, height: 126 }, duration: 1400 }]} reduced={false} onDone={noop} /></div> },

  // ---- Access / Login ----
  { id: "LoginCard", title: "LoginCard", group: "Access", render: () => <LoginCard error="" setError={noop} onAccess={noop} /> },
  { id: "AccessView", title: "AccessView (Screen)", group: "Access", full: true, render: () => <AccessView intro={false} error="" setError={noop} onAccess={noop} /> },

  // ---- Lobby-Liste ----
  { id: "LobbyToolbar", title: "LobbyToolbar", group: "Lobby-Liste", render: () => <LobbyToolbar search="" setSearch={noop} onSearch={noop} onCreate={noop} /> },
  { id: "LobbyCard", title: "LobbyCard", group: "Lobby-Liste", render: () => <LobbyCard entry={lobby} index={0} busy={false} onJoin={noop} /> },
  { id: "LobbyBrowser", title: "LobbyBrowser", group: "Lobby-Liste", render: () => <><State label="mit Lobbys"><LobbyBrowser lobbies={[lobby, makeLobby({ code: "ZZ99", name: "Zweite Lobby" })]} loaded busy={false} onJoin={noop} /></State><State label="lädt"><LobbyBrowser lobbies={[]} loaded={false} busy={false} onJoin={noop} /></State></> },
  { id: "LobbySettingsDialog", title: "LobbySettingsDialog", group: "Lobby-Liste", full: true, render: () => <LobbySettingsDialog defaultName="Meine Lobby" onClose={noop} onCreated={asyncNoop} setError={noop} /> },
  { id: "LobbyListView", title: "LobbyListView (Screen)", group: "Lobby-Liste", full: true, render: () => <LobbyListView user={user} connected revision={0} error="" setError={noop} onLobby={asyncNoop} onLogout={asyncNoop} onProfile={noop} initialLobbies={[lobby, makeLobby({ code: "ZZ99", name: "Zweite Lobby" })]} autoRefresh={false} /> },

  // ---- Lobby ----
  { id: "SettingBadges", title: "SettingBadges", group: "Lobby", render: () => <SettingBadges settings={lobby.settings} /> },
  { id: "MemberCard", title: "MemberCard", group: "Lobby", render: () => <div className="member-list">{lobby.players.map((player) => <MemberCard key={player.user.id} player={player} hostId={lobby.host.id} onProfile={noop} />)}</div> },
  { id: "MemberSlotEmpty", title: "MemberSlotEmpty", group: "Lobby", render: () => <div className="member-list"><MemberSlotEmpty /></div> },
  { id: "MembersPanel", title: "MembersPanel", group: "Lobby", render: () => <MembersPanel players={lobby.players} maxPlayers={lobby.settings.maxPlayers} hostId={lobby.host.id} allReady={false} emptySeats={[undefined]} onProfile={noop} /> },
  { id: "LobbyView", title: "LobbyView (Screen)", group: "Lobby", full: true, render: () => <LobbyView user={gameUser} lobby={lobby} connected voice={makeVoice()} error="" setError={noop} onLeave={async () => true} onProfile={noop} /> },

  // ---- Gametable ----
  { id: "PhaseHud", title: "PhaseHud · alle Phasen", group: "Gametable", render: () => <PhaseHudPreview /> },
  { id: "TurnOrderPlayer", title: "TurnOrderPlayer", group: "Gametable", render: () => <div className="game-hud"><TurnOrderPlayer player={waitingSeats[0]} index={0} cards={waitingSeats[0].handCount} seatRef={noop} onProfile={noop} /></div> },
  { id: "TurnOrder", title: "TurnOrder", group: "Gametable", render: () => <div className="game-hud"><TurnOrder players={waitingSeats} seatRef={() => noop} shownCards={(player) => player.handCount} onProfile={noop} /></div> },
  { id: "ActivePlayerHud", title: "ActivePlayerHud", group: "Gametable", render: () => <div className="game-hud"><ActivePlayerHud player={activeSeat} isSelf cards={activeSeat.handCount} seatRef={noop} onProfile={noop} opensAt={null} deadlineAt={new Date(Date.now() + 42_000).toISOString()} finished={false} /></div> },
  { id: "GameHud", title: "GameHud", group: "Gametable", render: () => <GameHud turnOrder={waitingSeats} activePlayer={activeSeat} userId={gameUser.id} round={3} phase={3} selfPhaseLaid seatRef={() => noop} shownCards={(player) => player.handCount} onProfile={noop} opensAt={null} deadlineAt={new Date(Date.now() + 42_000).toISOString()} finished={false} /> },
  { id: "TurnCountdown", title: "TurnCountdown", group: "Gametable", render: () => <><State label="läuft"><TurnCountdown opensAt={null} deadlineAt={new Date(Date.now() + 42_000).toISOString()} finished={false} /></State><State label="dringend"><TurnCountdown opensAt={null} deadlineAt={new Date(Date.now() + 6_000).toISOString()} finished={false} /></State><State label="unbegrenzt"><TurnCountdown opensAt={null} deadlineAt={null} finished={false} /></State></> },
  { id: "GameBoard", title: "GameBoard", group: "Gametable", render: () => <GameBoard zoneClass={() => ""} anchor={() => noop} runZone={noop} canDraw canDiscard canLay shownDraw={54} shownDiscard={{ top: demoCards[0], count: 6 }} discardTop={demoCards[0]} melds={[demoMeld]} openMelds={[demoMeld.id]} arrivals={{}} /> },
  { id: "PlayerHand", title: "PlayerHand", group: "Gametable", render: () => <PlayerHand handRef={noop} cards={demoCards} selected={[demoCards[2].id]} dragCardId={null} arrivals={{}} startDrag={() => noop} toggleCard={noop} /> },
  { id: "BuyButton", title: "BuyButton", group: "Gametable", render: () => <><State label="verfügbar"><div style={{ position: "relative", height: 110 }}><BuyButton visible position={{ left: 0, top: 20, width: 84, height: 56 }} canBuy busy={false} onPointerUp={noop} onClick={noop} /></div></State><State label="deaktiviert"><div style={{ position: "relative", height: 110 }}><BuyButton visible position={{ left: 0, top: 20, width: 84, height: 56 }} canBuy={false} busy={false} onPointerUp={noop} onClick={noop} /></div></State></> },
  { id: "GameEvents", title: "GameEvents", group: "Gametable", render: () => <GameEvents events={[{ key: "e1", text: "Milan zieht eine Karte" }, { key: "e2", text: "Du legst ab" }]} /> },
  { id: "SortControl", title: "SortControl", group: "Gametable", render: () => <div className="menu-sort"><SortControl sort="rank" onSort={noop} /></div> },
  { id: "GameMenu", title: "GameMenu", group: "Gametable", render: () => <GameMenu sort="rank" onSort={noop} onScoreboard={noop} onProfile={noop} onTutorial={noop} onLeave={noop} onClose={noop} /> },
  { id: "GameView", title: "GameView (Screen)", group: "Gametable", full: true, render: () => <GameView user={gameUser} lobby={activeLobby} game={activeGame} connected introHold={false} onGame={noop} onLeave={async () => true} onProfile={noop} onTutorial={noop} /> },

  // ---- Overlays ----
  { id: "MatchStartOverlay", title: "MatchStartOverlay", group: "Overlays", full: true, render: () => <MatchStartOverlay round={2} phase={2} /> },
  { id: "DealStage", title: "DealStage", group: "Overlays", full: true, render: () => <DealStage rect={{ left: window.innerWidth / 2 - 60, top: window.innerHeight / 2 - 84, width: 120, height: 168 }} stage="shuffle" /> },
  { id: "Scoreboard", title: "Scoreboard", group: "Overlays", full: true, render: () => <Scoreboard game={makeGame()} lobby={lobby} onClose={noop} /> },
  { id: "ScoreHistory", title: "ScoreHistory", group: "Overlays", render: () => <ScoreHistory rounds={activeGame.state.roundResults} rows={scoreRows} lobby={activeLobby} /> },
  { id: "RoundResultOverlay", title: "RoundResultOverlay", group: "Overlays", full: true, render: () => <RoundResultOverlay result={demoRoundResult} nextPhase={3} lobby={lobby} onContinue={noop} /> },
  { id: "FinalResultOverlay", title: "FinalResultOverlay", group: "Overlays", full: true, render: () => <FinalResultOverlay placements={demoPlacements} lobby={lobby} onLeave={async () => true} /> },
  { id: "ConfirmationDialog", title: "ConfirmationDialog", group: "Overlays", full: true, render: () => <ConfirmationDialog title="Laufende Partie verlassen?" message="Du verlässt die Partie sofort." busy={false} confirmLabel="Ja, verlassen" onConfirm={noop} onCancel={noop} /> },
  { id: "AchievementToasts", title: "AchievementToasts", group: "Overlays", full: true, render: () => <AchievementToasts unlocks={[{ id: "p1", label: "Phase 1 gewonnen", threshold: 1, unlocked: true, unlockedAt: new Date().toISOString() }]} onDismiss={noop} /> },

  // ---- Profil ----
  { id: "ProfileSummary", title: "ProfileSummary", group: "Profil", render: () => <ProfileSummary preview={<AvatarEditor avatar={<Avatar user={user} large />} editable open={false} busy={false} canRemove={false} onToggle={noop} onPick={noop} onRemove={noop} />} displayed={{ username: "Demospieler" }} profile={demoProfile} /> },
  { id: "AvatarEditor", title: "AvatarEditor", group: "Profil", render: () => <><State label="geschlossen"><AvatarEditor avatar={<Avatar user={user} large />} editable open={false} busy={false} canRemove onToggle={noop} onPick={noop} onRemove={noop} /></State><State label="offen"><AvatarEditor avatar={<Avatar user={user} large />} editable open busy={false} canRemove onToggle={noop} onPick={noop} onRemove={noop} /></State></> },
  { id: "AudioSettingsPanel", title: "AudioSettingsPanel", group: "Profil", render: () => <><State label="aktiv"><AudioSettingsPanel preferences={{ music: 60, effects: 72, muted: false }} onToggleMute={noop} onLevel={noop} /></State><State label="stumm"><AudioSettingsPanel preferences={{ music: 60, effects: 72, muted: true }} onToggleMute={noop} onLevel={noop} /></State></> },
  { id: "ProfileDialog", title: "ProfileDialog", group: "Profil", full: true, render: () => <ProfileDialog viewer={user} userId={user.id} onUser={noop} onTutorial={noop} onClose={noop} initialProfile={demoProfile} /> },
  { id: "AchievementTreeOverlay", title: "AchievementTreeOverlay", group: "Profil", full: true, render: () => <AchievementTreeOverlay tree={demoTree} username="Demospieler" onClose={noop} /> },
  { id: "AchievementTile", title: "AchievementTile", group: "Profil", render: () => <div className="tree-canvas" style={{ position: "relative", minHeight: 220 }}><AchievementTile placement={achievementPlacement} tile={84} fresh={false} onShow={noop} onHide={noop} /></div> },
  { id: "AchievementTooltip", title: "AchievementTooltip", group: "Profil", render: () => <div className="tree-canvas" style={{ position: "relative", minHeight: 220 }}><AchievementTooltip tip={{ branch: achievementPlacement.branch, node: achievementPlacement.node, x: 180, y: 150 }} /></div> },

  // ---- Spieler-Interaktion ----
  { id: "PlayerInteractionCard", title: "PlayerInteractionCard", group: "Interaktion", full: true, render: () => <PlayerInteractionCard username="Milan" avatar={<Avatar user={makeUser({ username: "Milan" })} large />} audio={{ volume: 0.8, muted: false }} canKick onProfile={noop} onVolume={noop} onMute={noop} onKick={asyncNoop} onClose={noop} /> },
  { id: "PlayerVoiceControls", title: "PlayerVoiceControls", group: "Interaktion", render: () => <PlayerVoiceControls username="Milan" audio={{ volume: .72, muted: false }} onVolume={noop} onMute={noop} /> },

  // ---- Tutorial ----
  { id: "TutorialProgress", title: "TutorialProgress", group: "Tutorial", render: () => <div className="tutorial-dialog"><TutorialProgress count={4} step={1} /></div> },
  { id: "TutorialChapterBody", title: "TutorialChapterBody", group: "Tutorial", render: () => <div className="tutorial-dialog"><div className="tutorial-content"><TutorialChapterBody chapter={TUTORIAL_CHAPTERS[0]} read /></div></div> },
  { id: "TutorialFeed", title: "TutorialFeed", group: "Tutorial", render: () => <div className="tutorial-dialog"><TutorialFeed readMask={5} onReach={noop} /></div> },
  { id: "TutorialDialog", title: "TutorialDialog", group: "Tutorial", full: true, render: () => <TutorialDialog user={user} onUser={noop} onClose={noop} /> },

  // ---- Sonstige ----
  { id: "SlideStage", title: "SlideStage", group: "Sonstige", render: () => <SlideStagePreview /> },
  { id: "PanZoom", title: "PanZoom", group: "Sonstige", render: () => <div style={{ height: 320 }}><PanZoom contentWidth={600} contentHeight={400}><div style={{ width: 600, height: 400, background: "repeating-linear-gradient(45deg,#52796f22,#52796f22 20px,#20312d 20px,#20312d 40px)", display: "grid", placeItems: "center" }}><strong>Ziehen &amp; Zoomen</strong></div></PanZoom></div> },
  { id: "PileDesignView", title: "PileDesignView (Design-Route)", group: "Design-Route", full: true, render: () => <PileDesignView /> }
];

export function findPreview(id: string): Preview | undefined {
  return previews.find((preview) => preview.id === id);
}
