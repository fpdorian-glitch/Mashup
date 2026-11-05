/* Arena Reborn: presentation only. Scores, turns and outcomes belong to the server. */
const STATS = ["power", "size", "def", "aura", "intelligence"];
export function arenaSequence(quality = "balanced") {
  if (quality === "fluid") return [{ phase: "result", at: 0 }];
  const scale = quality === "spectacular" ? 1 : 0.6;
  return [
    ["reveal", 0],
    ["compare", 260],
    ["impact", 570],
    ["result", 1050],
  ].map(([phase, at]) => ({ phase, at: Math.round(at * scale) }));
}
export function arenaSnapshotKey(s = {}) {
  return JSON.stringify([
    s.matchId,
    s.round,
    s.stage,
    !!s.finished,
    s.winner,
    s.stat,
    s.playerScore,
    s.enemyScore,
    s.turn,
    s.direction,
    s.mode,
  ]);
}
export function createArenaRebornPresentation({
  getQuality = () => "balanced",
  isReducedMotion = () => false,
  clock = {},
} = {}) {
  const later = clock.setTimeout || ((fn, ms) => setTimeout(fn, ms)),
    cancel = clock.clearTimeout || ((id) => clearTimeout(id));
  let field = null,
    previousKey = null,
    previousMatch = null,
    phase = "idle";
  const timers = new Set(),
    animations = new Set();
  function stop() {
    for (const id of timers) cancel(id);
    timers.clear();
    for (const a of animations) {
      try {
        a.cancel();
      } catch {}
    }
    animations.clear();
  }
  function setPhase(value) {
    phase = value;
    if (field?.isConnected !== false)
      field?.setAttribute("data-rb-phase", value);
  }
  function skip() {
    stop();
    if (field) {
      field.setAttribute("data-rb-skipped", "true");
      setPhase("result");
    }
    return phase;
  }
  function clear() {
    stop();
    field = null;
    previousKey = null;
    previousMatch = null;
    phase = "idle";
  }
  function animate(node, frames, options) {
    if (!node?.animate) return;
    try {
      const a = node.animate(frames, {
        fill: "none",
        easing: "cubic-bezier(.2,.72,.25,1)",
        ...options,
      });
      animations.add(a);
      a.finished?.then(
        () => animations.delete(a),
        () => animations.delete(a),
      );
    } catch {}
  }
  function update(snapshot = {}) {
    const next = snapshot.root?.matches?.(".rb-arena")
      ? snapshot.root
      : snapshot.root?.querySelector?.(".rb-arena");
    if (!next || next.isConnected === false) {
      clear();
      return { changed: false, animated: false };
    }
    const quality =
      isReducedMotion() || snapshot.quality === "fluid"
        ? "fluid"
        : snapshot.quality || getQuality();
    const key = arenaSnapshotKey(snapshot),
      changed = key !== previousKey,
      replaced = next !== field;
    if (changed || replaced) stop();
    field = next;
    const choose = snapshot.stage === "choose" && !snapshot.finished;
    const winner = ["player", "enemy", "draw", "tie"].includes(snapshot.winner)
      ? snapshot.winner
      : "";
    field.setAttribute("data-rb-quality", quality);
    field.setAttribute(
      "data-rb-stage",
      choose ? "choose" : snapshot.finished ? "finished" : "reveal",
    );
    field.setAttribute(
      "data-rb-direction",
      ["higher", "lower"].includes(snapshot.direction)
        ? snapshot.direction
        : "unknown",
    );
    field.setAttribute(
      "data-rb-turn",
      snapshot.turn === "enemy" ? "enemy" : "player",
    );
    field.setAttribute(
      "data-rb-mode",
      snapshot.mode === "double" ? "double" : "simple",
    );
    field.setAttribute(
      "data-rb-winner",
      choose ? "" : winner === "tie" ? "draw" : winner,
    );
    const stat = STATS.indexOf(snapshot.stat);
    field
      .querySelectorAll(".rb-stat-selected")
      .forEach((n) => n.classList.remove("rb-stat-selected"));
    if (!choose && stat >= 0)
      field
        .querySelectorAll(
          ".v10-stat-" + stat + ', [data-stat="' + STATS[stat] + '"]',
        )
        .forEach((n) => n.classList.add("rb-stat-selected"));
    // A repeated poll or a DOM rebuild must never replay the same confrontation.
    if (!changed) {
      if (replaced || quality === "fluid") skip();
      return { changed: false, animated: false };
    }
    const sameMatch = previousMatch === snapshot.matchId;
    previousKey = key;
    previousMatch = snapshot.matchId;
    field.removeAttribute("data-rb-skipped");
    const visible = field.ownerDocument?.visibilityState !== "hidden";
    if (quality === "fluid" || !visible) {
      setPhase(choose ? "ready" : "result");
      return { changed: true, animated: false };
    }
    const original = field,
      teams = Array.from(field.querySelectorAll(".rb-team"));
    if (choose) {
      setPhase("ready");
      teams.forEach((team, i) =>
        animate(
          team,
          [
            {
              opacity: 0.25,
              transform: "translate3d(" + (i ? -22 : 22) + "px,18px,0)",
            },
            { opacity: 1, transform: "translate3d(0,0,0)" },
          ],
          { duration: quality === "spectacular" ? 360 : 210 },
        ),
      );
    } else {
      const gap = Math.abs(Number(snapshot.pValue) - Number(snapshot.eValue));
      field.style?.setProperty(
        "--rb-impact-strength",
        String(Number.isFinite(gap) ? Math.min(1, 0.36 + gap / 160) : 0.5),
      );
      const steps = arenaSequence(quality),
        end = steps.at(-1).at;
      for (const step of steps) {
        if (!step.at) {
          setPhase(step.phase);
          continue;
        }
        const id = later(() => {
          timers.delete(id);
          if (field === original && original.isConnected !== false)
            setPhase(step.phase);
        }, step.at);
        timers.add(id);
      }
      teams.forEach((team, i) => {
        const own = i === 0,
          won = winner === (own ? "player" : "enemy"),
          lost = winner === (own ? "enemy" : "player"),
          toward = own ? 1 : -1;
        animate(
          team,
          [
            { transform: "translate3d(0,0,0)", offset: 0 },
            {
              transform: "translate3d(" + toward * 10 + "px,-3px,0)",
              offset: 0.37,
            },
            {
              transform:
                "translate3d(" + toward * 17 + "px,-5px,0) scale(1.025)",
              offset: 0.54,
            },
            {
              transform:
                "translate3d(" +
                (won ? toward * 5 : lost ? -toward * 5 : 0) +
                "px," +
                (won ? -7 : lost ? 5 : 0) +
                "px,0) scale(" +
                (won ? 1.04 : lost ? 0.97 : 1) +
                ")",
              offset: 0.75,
            },
            { transform: "translate3d(0,0,0)", offset: 1 },
          ],
          { duration: end + 200 },
        );
      });
      animate(
        field.querySelector(".rb-sweep"),
        [
          { opacity: 0, transform: "translateX(-100%) rotate(-20deg)" },
          { opacity: 0.7, offset: 0.5 },
          { opacity: 0, transform: "translateX(100%) rotate(-20deg)" },
        ],
        { duration: 380, delay: quality === "spectacular" ? 180 : 80 },
      );
      animate(
        field.querySelector(".rb-impact"),
        [
          { opacity: 0, transform: "translate(-50%,-50%) scale(.2)" },
          { opacity: 0.85, offset: 0.2 },
          { opacity: 0, transform: "translate(-50%,-50%) scale(2.2)" },
        ],
        { duration: 480, delay: steps[2].at },
      );
      if (sameMatch)
        animate(
          field.querySelector(".rb-scoreboard"),
          [
            { transform: "scale(1)" },
            { transform: "scale(1.05)", offset: 0.5 },
            { transform: "scale(1)" },
          ],
          { duration: 260, delay: end },
        );
      if (snapshot.finished)
        animate(
          field.querySelector(".rb-outcome"),
          [
            { opacity: 0.65, transform: "translateY(6px)" },
            { opacity: 1, transform: "translateY(0)" },
          ],
          { duration: 350, delay: end },
        );
    }
    return { changed: true, animated: true };
  }
  return {
    update,
    clear,
    skip,
    get phase() {
      return phase;
    },
    get activeAnimations() {
      return animations.size;
    },
  };
}
