import '../src/shared/theme.css';
import { mount } from 'svelte';

const forced = new URLSearchParams(location.search).get('view');
const isDesktop = forced ? forced === 'desktop' : window.matchMedia('(min-width: 768px)').matches;

const target = document.getElementById('app')!;
target.innerHTML = '';
const AppMod = isDesktop
  ? await import('./desktop/App.svelte')
  : await import('./mobile/App.svelte');
mount(AppMod.default, { target });
