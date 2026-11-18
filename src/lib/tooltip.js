import { reactive } from 'vue';

// Tooltip flutuante único, compartilhado pelos gráficos
export const tip = reactive({ show: false, x: 0, y: 0, title: '', lines: [] });

export function showTip(e, title, lines = []) {
    tip.show = true;
    tip.title = title;
    tip.lines = lines;
    moveTip(e);
}
export function moveTip(e) {
    tip.x = e.clientX;
    tip.y = e.clientY;
}
export function hideTip() {
    tip.show = false;
}
