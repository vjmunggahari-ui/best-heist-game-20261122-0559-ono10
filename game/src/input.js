// Velvet Vault — keyboard and mouse state.
// One job: turn raw DOM events into a plain input snapshot the game reads.

export function createInput(canvas) {
  const keys = new Set();
  const mouse = { x: 0, y: 0, clicked: false, clickX: 0, clickY: 0 };
  const pressed = new Set(); // keys pressed since last consume

  function keyName(e) {
    return e.key.length === 1 ? e.key.toLowerCase() : e.key;
  }

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
      e.preventDefault();
    }
    const k = keyName(e);
    if (!keys.has(k)) pressed.add(k);
    keys.add(k);
  });
  window.addEventListener('keyup', (e) => keys.delete(keyName(e)));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
    mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
  });
  canvas.addEventListener('mousedown', (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.clickX = (e.clientX - r.left) * (canvas.width / r.width);
    mouse.clickY = (e.clientY - r.top) * (canvas.height / r.height);
    mouse.clicked = true;
  });

  return {
    // Held keys: 'w','a','s','d', arrows, 'shift', 'c', 'e', 'm', 'enter', 'r', '1', '2'.
    down(...names) {
      return names.some((n) => keys.has(n));
    },
    // True once per physical press; the game consumes it each frame.
    wasPressed(name) {
      return pressed.has(name);
    },
    consumePressed() {
      pressed.clear();
    },
    consumeClick() {
      const was = mouse.clicked;
      mouse.clicked = false;
      return was ? { x: mouse.clickX, y: mouse.clickY } : null;
    },
    mouse() {
      return { x: mouse.x, y: mouse.y };
    },
  };
}
