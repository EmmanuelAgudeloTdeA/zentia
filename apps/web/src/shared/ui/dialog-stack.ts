const stack: symbol[] = [];

/** Registra un diálogo abierto; solo el de arriba atiende Escape y la trampa de foco. */
export function pushDialog(): { isTop: () => boolean; release: () => void } {
  const id = Symbol('dialog');
  stack.push(id);
  return {
    isTop: () => stack[stack.length - 1] === id,
    release: () => {
      const index = stack.indexOf(id);
      if (index >= 0) stack.splice(index, 1);
    },
  };
}
