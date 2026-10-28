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

/** 島嶼名牌：水果名 + 知識點數（+ 居民數） */
export function islandLabel(name: string, spotCount: number, peopleCount = 0): Label {
  const label = base('lbl lbl-island');
  const b = document.createElement('b');
  b.textContent = name;
  const i = document.createElement('i');
  i.textContent = peopleCount > 0 ? `${spotCount} 知識點・${peopleCount} 位居民` : `${spotCount} 知識點`;
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

/** 居民名牌：名稱 + 身分，BOSS 另有皇冠記號 */
export function residentLabel(name: string, role: string, color: string, boss = false): Label {
  const label = base(`lbl lbl-resident${boss ? ' is-boss' : ''}`);
  const em = document.createElement('em');
  em.textContent = boss ? '★' : '●';
  em.style.background = color;
  const b = document.createElement('b');
  b.textContent = name;
  const i = document.createElement('i');
  i.textContent = role;
  label.el.append(em, b, i);
  return label;
}

export function setLabelActive(label: Label, active: boolean): void {
  label.el.classList.toggle('is-active', active);
}

/** 改居民名牌第二行（吳總巡到哪座島會即時更新） */
export function setResidentLabelRole(label: Label, role: string): void {
  const i = label.el.querySelector('i');
  if (i) i.textContent = role;
}

export function setLabelVisible(label: Label, visible: boolean): void {
  label.el.classList.toggle('is-hidden', !visible);
}
