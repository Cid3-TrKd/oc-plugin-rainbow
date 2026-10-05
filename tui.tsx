/** @jsxImportSource @opentui/solid */
import { Plugin } from "@opencode/plugin/tui";
import { TargetChannel, type OptimizedBuffer } from "@opentui/core";
import { createMemo } from "solid-js";
import { LogoScreen } from "./logo-screen";
import { createRainbowPostProcess, type RainbowTheme } from "./rainbow-post-process";
import { SettingsDialog, type SettingsState, type ToggleField, type NumberField } from "./settings-dialog";

const id = "tui-rainbow";
const speed = 0.008;
const turns = 3;
const glow = 0.05;
const splashRoute = `${id}.logo`;
const splashCommand = `${id}.logo-splash`;
const splashFadeInMs = 1050;
const splashPeakHoldMs = 34;
const splashFadeOutMs = 100;
const splashKeybind = "ctrl+shift+r";
const rainbowMinFps = 12;
const rainbowMaxFps = 24;
const rainbowPhaseStep = 0.05;

type SplashPhase = "idle" | "fade-in" | "hold" | "fade-out";
type SplashState = {
  phase: SplashPhase;
  elapsed: number;
  queued: boolean;
};

type Cfg = SettingsState;

const clamp = (value: number, min: number, max: number) => {
  if (value < min) return min;
  if (value > max) return max;
  return value;
};

const num = (value: unknown, fallback: number) => {
  if (typeof value !== "number") return fallback;
  return value;
};

const bool = (value: unknown, fallback: boolean) => {
  if (typeof value !== "boolean") return fallback;
  return value;
};

const splashFadeIn = (t: number) => {
  const split = 0.78;
  const base = 0.16;
  if (t <= 0) return 0;
  if (t < split) {
    const head = t / split;
    return base * head * head;
  }
  if (t >= 1) return 1;
  const tail = (t - split) / (1 - split);
  return base + (1 - base) * 2 ** (10 * tail - 10);
};

const splashFadeOut = (t: number) => {
  if (t <= 0) return 1;
  if (t >= 1) return 0;
  const left = 1 - t;
  return left * left * left;
};

const whiteMatrix = new Float32Array(16);

const setWhiteMatrix = (strength: number) => {
  const keep = 1 - strength;
  whiteMatrix[0] = keep;
  whiteMatrix[1] = 0;
  whiteMatrix[2] = 0;
  whiteMatrix[3] = strength;
  whiteMatrix[4] = 0;
  whiteMatrix[5] = keep;
  whiteMatrix[6] = 0;
  whiteMatrix[7] = strength;
  whiteMatrix[8] = 0;
  whiteMatrix[9] = 0;
  whiteMatrix[10] = keep;
  whiteMatrix[11] = strength;
  whiteMatrix[12] = 0;
  whiteMatrix[13] = 0;
  whiteMatrix[14] = 0;
  whiteMatrix[15] = 1;
};

const anim = (cfg: Cfg) => {
  return cfg.speed > 0 && (cfg.fg || (cfg.bg && cfg.glow > 0));
};

const rainbowFrameMs = (cfg: Cfg) => {
  const phaseRate = cfg.speed * (cfg.fg ? 0.1 : 0.04);
  if (phaseRate <= 0) return 1000 / rainbowMinFps;
  return clamp(rainbowPhaseStep / phaseRate, 1000 / rainbowMaxFps, 1000 / rainbowMinFps);
};

const defaults = (opts: Record<string, unknown> | undefined): Cfg => {
  return {
    fg: bool(opts?.fg, true),
    bg: bool(opts?.bg, true),
    speed: clamp(num(opts?.speed, speed), 0, 0.03),
    turns: clamp(num(opts?.turns, turns), 0.25, 8),
    glow: clamp(num(opts?.glow, glow), 0, 0.15),
  };
};

const themeOf = (theme: any): RainbowTheme => {
  return {
    text: theme.text.base,
    textMuted: theme.text.muted,
    primary: theme.hue.interactive[500],
    accent: theme.hue.accent[500],
    secondary: theme.hue.neutral[500],
    background: theme.background.base,
    backgroundPanel: theme.background.raised.base,
    backgroundElement: theme.background.raised.high,
    backgroundMenu: theme.background.raised.max,
  };
};

export default Plugin.define({
  id,
  setup(context) {
    const options = context.options as Record<string, any> | undefined;
    if (options?.enabled === false) return;

    const [store, update] = context.storage.store<Cfg>("settings", {
      initial: defaults(options),
    });
    const theme = createMemo(() => themeOf(context.theme));
    const value = (): Cfg => ({
      fg: store.fg,
      bg: store.bg,
      speed: store.speed,
      turns: store.turns,
      glow: store.glow,
    });
    const apply: (buffer: OptimizedBuffer, delta: number) => void = createRainbowPostProcess(theme, value);
    const splash: SplashState = {
      phase: "idle",
      elapsed: 0,
      queued: false,
    };
    let live = false;
    let disposed = false;
    let rainbowTimer: ReturnType<typeof setTimeout> | undefined;

    const splashLive = () => splash.phase !== "idle";

    const clearRainbowTimer = () => {
      if (rainbowTimer === undefined) return;
      clearTimeout(rainbowTimer);
      rainbowTimer = undefined;
    };

    // Keep the ambient effect on one-shot renders instead of a continuous live loop.
    const scheduleRainbow = (cfg = value()) => {
      if (disposed || splashLive() || !anim(cfg) || rainbowTimer !== undefined) return;
      rainbowTimer = setTimeout(() => {
        rainbowTimer = undefined;
        if (disposed || splashLive()) return;
        const next = value();
        if (!anim(next)) return;
        context.renderer.requestRender();
        scheduleRainbow(next);
      }, rainbowFrameMs(cfg));
    };

    const sync = (cfg = value()) => {
      const nextLive = splashLive();
      if (nextLive && !live) {
        context.renderer.requestLive();
        live = true;
      }
      if (!nextLive && live) {
        context.renderer.dropLive();
        live = false;
      }

      clearRainbowTimer();
      if (!nextLive && anim(cfg)) {
        scheduleRainbow(cfg);
      }
    };

    const startSplash = () => {
      if (splash.phase !== "idle") return;
      const current = context.ui.router.current();
      if (current.type === "plugin" && current.name === splashRoute) return;
      context.ui.dialog.clear();
      splash.phase = "fade-in";
      splash.elapsed = 0;
      splash.queued = false;
      sync();
      context.renderer.requestRender();
    };

    const leaveSplash = () => {
      splash.phase = "idle";
      splash.elapsed = 0;
      splash.queued = false;
      context.ui.router.navigate({ type: "home" });
      sync();
      context.renderer.requestRender();
    };

    const fadeToLogo = (buffer: OptimizedBuffer, delta: number) => {
      if (splash.phase === "idle") return;
      splash.elapsed += delta;

      let strength = 0;
      if (splash.phase === "fade-in") {
        const t = clamp(splash.elapsed / splashFadeInMs, 0, 1);
        strength = splashFadeIn(t);
        if (t >= 1 && !splash.queued) {
          splash.phase = "hold";
          splash.elapsed = 0;
          splash.queued = true;
          queueMicrotask(() => {
            if (disposed) return;
            context.ui.router.navigate({ type: "plugin", name: splashRoute });
            splash.queued = false;
            sync();
            context.renderer.requestRender();
          });
        }
      } else if (splash.phase === "hold") {
        strength = 1;
        if (splash.elapsed >= splashPeakHoldMs) {
          splash.phase = "fade-out";
          splash.elapsed = 0;
        }
      } else {
        const t = clamp(splash.elapsed / splashFadeOutMs, 0, 1);
        strength = splashFadeOut(t);
        if (t >= 1) {
          splash.phase = "idle";
          splash.elapsed = 0;
          splash.queued = false;
          sync();
          return;
        }
      }

      if (strength <= 0) return;
      setWhiteMatrix(strength);
      buffer.colorMatrixUniform(whiteMatrix, 1, TargetChannel.Both);
    };

    const unregisterRoute = context.ui.router.register({
      name: splashRoute,
      render: () => <LogoScreen onExit={leaveSplash} />,
    });

    const flip = (key: ToggleField) => {
      void update((draft) => {
        draft[key] = !draft[key];
      }).then(() => sync());
    };

    const tune = (key: NumberField, dir: -1 | 1) => {
      const step = key === "speed" ? 0.001 : key === "turns" ? 0.25 : 0.01;
      const min = key === "speed" ? 0 : key === "turns" ? 0.25 : 0;
      const max = key === "speed" ? 0.03 : key === "turns" ? 8 : 0.15;
      const digits = key === "speed" ? 3 : 2;
      const next = Number(clamp(store[key] + step * dir, min, max).toFixed(digits));
      void update((draft) => {
        draft[key] = next;
      }).then(() => sync());
    };

    const show = () => {
      context.ui.dialog.set({ size: "medium" });
      context.ui.dialog.show(() => (
        <SettingsDialog value={value} flip={flip} tune={tune} />
      ));
    };

    context.renderer.addPostProcessFn(apply);
    context.renderer.addPostProcessFn(fadeToLogo);
    sync();

    const configuredKeybind =
      typeof options?.keybinds?.logo_splash === "string" ? options.keybinds.logo_splash : splashKeybind;

    context.keymap.layer(() => ({
      mode: "global",
      commands: [
        {
          id: splashCommand,
          title: "Show logo splash",
          group: "Plugin",
          description: "Fade to white and reveal a centered OpenCode logo screen",
          palette: true,
          bind: configuredKeybind,
          run: startSplash,
        },
        {
          id: `${id}.settings`,
          title: "Rainbow settings",
          group: "Plugin",
          palette: true,
          slash: { name: "rainbow-settings" },
          run: show,
        },
      ],
    }));

    return () => {
      disposed = true;
      clearRainbowTimer();
      unregisterRoute();
      context.renderer.removePostProcessFn(apply);
      context.renderer.removePostProcessFn(fadeToLogo);
      if (live) {
        context.renderer.dropLive();
        live = false;
      }
    };
  },
});
