/** @jsxImportSource @opentui/solid */
import { useKeyboard } from "@opentui/solid";
import { usePlugin } from "@opencode/plugin/tui";
import { createSignal, For } from "solid-js";

export type SettingsState = {
  fg: boolean;
  bg: boolean;
  speed: number;
  turns: number;
  glow: number;
};

export type ToggleField = "fg" | "bg";
export type NumberField = "speed" | "turns" | "glow";
export type Field = ToggleField | NumberField;

type RowBase = {
  title: string;
  description: string;
  category: string;
};

type ToggleRow = RowBase & {
  key: ToggleField;
  kind: "toggle";
};

type NumberRow = RowBase & {
  key: NumberField;
  kind: "number";
  step: number;
  min: number;
  max: number;
  digits: number;
};

type Row = ToggleRow | NumberRow;

const rows: Row[] = [
  {
    key: "fg",
    title: "Foreground effect",
    description: "Animate neutral text colors",
    category: "Effects",
    kind: "toggle",
  },
  {
    key: "bg",
    title: "Background effect",
    description: "Animate neutral background surfaces",
    category: "Effects",
    kind: "toggle",
  },
  {
    key: "speed",
    title: "Animation speed",
    description: "Controls how quickly the color band moves",
    category: "Motion",
    kind: "number",
    step: 0.001,
    min: 0,
    max: 0.03,
    digits: 3,
  },
  {
    key: "turns",
    title: "Band count",
    description: "Controls how many diagonal bands span the screen",
    category: "Motion",
    kind: "number",
    step: 0.25,
    min: 0.25,
    max: 8,
    digits: 2,
  },
  {
    key: "glow",
    title: "Background strength",
    description: "Intensity of the background color wash",
    category: "Surface",
    kind: "number",
    step: 0.01,
    min: 0,
    max: 0.15,
    digits: 2,
  },
];

export const settingByField = Object.fromEntries(rows.map((item) => [item.key, item])) as {
  [K in ToggleField]: ToggleRow;
} & {
  [K in NumberField]: NumberRow;
};

const status = (value: boolean) => {
  return value ? "ON" : "OFF";
};

const metric = (value: SettingsState, key: NumberField) => {
  return value[key].toFixed(settingByField[key].digits ?? 0);
};

export const SettingsDialog = (props: {
  value: () => SettingsState;
  flip: (key: ToggleField) => void;
  tune: (key: NumberField, dir: -1 | 1) => void;
}) => {
  const context = usePlugin();
  const [cur, setCur] = createSignal<Field>(rows[0]?.key ?? "fg");
  const current = () => settingByField[cur()] ?? settingByField.fg;

  const move = (dir: -1 | 1) => {
    const keys = rows.map((row) => row.key);
    const index = keys.indexOf(cur());
    const next = keys[(index + dir + keys.length) % keys.length];
    if (next) setCur(next);
  };

  useKeyboard((evt) => {
    const item = current();
    if (!item) return;

    if (evt.name === "up" || evt.name === "k") {
      evt.preventDefault();
      evt.stopPropagation();
      move(-1);
      return;
    }
    if (evt.name === "down" || evt.name === "j") {
      evt.preventDefault();
      evt.stopPropagation();
      move(1);
      return;
    }

    if (evt.name === "space" || evt.name === "enter") {
      evt.preventDefault();
      evt.stopPropagation();
      if (item.kind === "toggle") props.flip(item.key);
      return;
    }

    if (evt.name !== "left" && evt.name !== "right") return;
    evt.preventDefault();
    evt.stopPropagation();
    if (item.kind === "toggle") {
      props.flip(item.key);
      return;
    }
    props.tune(item.key, evt.name === "left" ? -1 : 1);
  });

  return (
    <box flexDirection="column">
      <box paddingLeft={2} paddingTop={1} flexShrink={0}>
        <text>
          <b>Rainbow settings</b>
        </text>
      </box>
      <box flexDirection="column" paddingLeft={2} paddingTop={1} flexShrink={0}>
        <For each={rows}>
          {(item) => {
            const active = () => cur() === item.key;
            const footer = () => (item.kind === "toggle" ? status(props.value()[item.key]) : metric(props.value(), item.key));
            return (
              <box flexDirection="column" paddingBottom={1}>
                <text>
                  <span style={{ fg: active() ? context.theme.hue.accent[500] : context.theme.text.base }}>
                    {active() ? "▸ " : "  "}
                    <b>{item.title}</b>
                  </span>
                  <span style={{ fg: context.theme.text.muted }}>  [{item.category}]  {footer()}</span>
                </text>
                <text>
                  <span style={{ fg: context.theme.text.muted }}>
                    {"    "}
                    {item.description}
                  </span>
                </text>
              </box>
            );
          }}
        </For>
      </box>
      <box paddingLeft={4} paddingBottom={1} flexDirection="row" gap={2} flexShrink={0}>
        <text>
          <span style={{ fg: context.theme.text.base }}>
            <b>toggle</b>{" "}
          </span>
          <span style={{ fg: context.theme.text.muted }}>space enter left/right</span>
        </text>
        <text>
          <span style={{ fg: context.theme.text.base }}>
            <b>adjust</b>{" "}
          </span>
          <span style={{ fg: context.theme.text.muted }}>left/right</span>
        </text>
      </box>
    </box>
  );
};
