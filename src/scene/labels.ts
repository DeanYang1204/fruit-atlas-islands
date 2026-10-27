import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

export interface Label {
  obj: CSS2DObject;
  el: HTMLElement;
}

function base(cls: string): Label {
  const el = document.createElement('div');
  el.className = cls;
  const obj = new CSS2DObject(el);
  return { obj, el };
}

/** 島嶼名牌：水果名 + 知識點數 */
export function islandLabel(name: string, spotCount: number): Label {
  const label = base('lbl lbl-island');
  const b = document.createElement('b');
  b.textContent = name;
  const i = document.createElement('i');
  i.textContent = `${spotCount} 知識點`;
  label.el.append(b, i);
  return label;
}

/** 知識點名牌：記號 + 標題 */
export function spotLabel(mark: string, title: string, color: string): Label {
  const label = base('lbl lbl-spot');
  const em = document.createElement('em');
  em.textContent = mark;
  em.style.background = color;
  const span = document.createElement('span');
  span.textContent = title;
  label.el.append(em, span);
  return label;
}

export function setLabelActive(label: Label, active: boolean): void {
  label.el.classList.toggle('is-active', active);
}

export function setLabelVisible(label: Label, visible: boolean): void {
  label.el.classList.toggle('is-hidden', !visible);
}
