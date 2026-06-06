import { getActionMenuPosition } from "./cardCoreLayout";

const ACTION_MENU_WIDTH = 150;
const ACTION_MENU_HEIGHT = 106;
const ACTION_MENU_GAP = 12;

function CardActionMenu({ card, areaWidth, areaHeight, scale, onFlip, onDeselect }) {
  const unscaledAreaWidth = areaWidth / scale;
  const unscaledAreaHeight = areaHeight / scale;

  const position = getActionMenuPosition({
    selectedObject: card,
    areaWidth: unscaledAreaWidth,
    areaHeight: unscaledAreaHeight,
    menuWidth: ACTION_MENU_WIDTH,
    menuHeight: ACTION_MENU_HEIGHT,
    gap: ACTION_MENU_GAP,
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
      <button type="button" onClick={onFlip}>
        Flip
      </button>

      <button type="button" onClick={onDeselect}>
        Deselect
      </button>
    </div>
  );
}

export default CardActionMenu;
