import { render } from 'preact';
import { App } from './App';
import { initSpatialNavigation } from './focus/spatialNavigation';
import './styles/global.scss';

initSpatialNavigation();

const root = document.getElementById('app');
if (!root) throw new Error('Missing #app root element');
render(<App />, root);
