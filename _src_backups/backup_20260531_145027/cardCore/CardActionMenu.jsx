import { getActionMenuPosition } from "./cardCoreLayout";

const ACTION_MENU_WIDTH = 170;
const ACTION_BUTTON_HEIGHT = 41;
const ACTION_MENU_PADDING = 20;
const ACTION_MENU_GAP = 8;
const ACTION_MENU_POSITION_GAP = 12;

function getMenuHeight(actionCount) {
  if (actionCount <= 0) return ACTION_MENU_PADDING;
  return (
    ACTION_MENU_PADDING +
    actionCount * ACTION_BUTTON_HEIGHT +
    Math.max(0, actionCount - 1) * ACTION_MENU_GAP
  );
}

function CardActionMenu({ objectRect, areaWidth, areaHeight, actions }) {
  const menuHeight = getMenuHeight(actions.length);

  const position = getActionMenuPosition({
    selectedObject: objectRect,
    areaWidth,
    areaHeight,
    menuWidth: ACTION_MENU_WIDTH,
    menuHeight,
    gap: ACTION_MENU_POSITION_GAP,
  });

  return (
    <div
      className="card-action-menu"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${ACTION_MENU_WIDTH}px`,
      }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {actions.map((action) => (
        <button key={action.label} type="button" onClick={action.onClick}>
          {action.label}
        </button>
      ))}
    </div>
  );
}

export default CardActionMenu;
