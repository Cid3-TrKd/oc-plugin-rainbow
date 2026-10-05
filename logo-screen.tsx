/** @jsxImportSource @opentui/solid */
import { RGBA, TextAttributes } from "@opentui/core";
import { usePlugin } from "@opencode/plugin/tui";
import { For, createMemo, type JSX } from "solid-js";
import { useKeyboard } from "@opentui/solid";

const logo = {
  left: [
    "                   ",
    "█▀▀█ █▀▀█ █▀▀█ █▀▀▄",
    "█__█ █__█ █^^^ █__█",
    "▀▀▀▀ █▀▀▀ ▀▀▀▀ ▀~~▀",
  ],
  right: [
    "             ▄     ",
    "█▀▀▀ █▀▀█ █▀▀█ █▀▀█",
    "█___ █__█ █__█ █^^^",
    "▀▀▀▀ ▀▀▀▀ ▀▀▀▀ ▀▀▀▀",
  ],
};
const marks = "_^~";
const shadowMarker = new RegExp(`[${marks}]`);

const tint = (a: RGBA, b: RGBA, amt: number) => {
  return RGBA.fromValues(
    a.r + (b.r - a.r) * amt,
    a.g + (b.g - a.g) * amt,
    a.b + (b.b - a.b) * amt,
    a.a + (b.a - a.a) * amt,
  );
};

const renderLine = (line: string, fg: RGBA, background: RGBA, bold: boolean): JSX.Element[] => {
  const shadow = tint(background, fg, 0.25);
  const attrs = bold ? TextAttributes.BOLD : undefined;
  const elements: JSX.Element[] = [];
  let i = 0;

  while (i < line.length) {
    const rest = line.slice(i);
    const markerIndex = rest.search(shadowMarker);

    if (markerIndex === -1) {
      elements.push(
        <text fg={fg} attributes={attrs} selectable={false}>
          {rest}
        </text>,
      );
      break;
    }

    if (markerIndex > 0) {
      elements.push(
        <text fg={fg} attributes={attrs} selectable={false}>
          {rest.slice(0, markerIndex)}
        </text>,
      );
    }

    switch (rest[markerIndex]) {
      case "_":
        elements.push(
          <text fg={fg} bg={shadow} attributes={attrs} selectable={false}>
            {" "}
          </text>,
        );
        break;
      case "^":
        elements.push(
          <text fg={fg} bg={shadow} attributes={attrs} selectable={false}>
            ▀
          </text>,
        );
        break;
      case "~":
        elements.push(
          <text fg={shadow} attributes={attrs} selectable={false}>
            ▀
          </text>,
        );
        break;
    }

    i += markerIndex + 1;
  }

  return elements;
};

export function LogoScreen(props: { onExit: () => void }) {
  const context = usePlugin();
  const theme = createMemo(() => context.theme);

  useKeyboard((evt) => {
    if (evt.name !== "escape") return;
    evt.preventDefault();
    evt.stopPropagation();
    props.onExit();
  });

  return (
    <box width="100%" height="100%" flexDirection="column" alignItems="center">
      <box flexGrow={1} minHeight={0} />
      <box flexShrink={0}>
        <For each={logo.left}>
          {(line, index) => (
            <box flexDirection="row" gap={1}>
              <box flexDirection="row">
                {renderLine(line, theme().text.muted, theme().background.base, false)}
              </box>
              <box flexDirection="row">
                {renderLine(logo.right[index()] ?? "", theme().text.base, theme().background.base, true)}
              </box>
            </box>
          )}
        </For>
      </box>
      <box height={3} minHeight={0} flexShrink={0} />
      <box flexGrow={1} minHeight={0} />
    </box>
  );
}
