import '../src/shared/theme.css';
import { mount } from 'svelte';
import MobileApp from './mobile/App.svelte';
import DesktopApp from './desktop/App.svelte';

const forced = new URLSearchParams(location.search).get('view');
const isDesktop = forced ? forced === 'desktop' : window.matchMedia('(min-width: 768px)').matches;

const target = document.getElementById('app')!;
target.innerHTML = '';
mount(isDesktop ? DesktopApp : MobileApp, { target });
