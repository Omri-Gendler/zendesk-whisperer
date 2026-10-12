import { configureSidePanelBehavior } from './panel.js';
import { restoreCache } from './cache.js';
import './listeners-install.js';
import './listeners-tabs.js';
import './listeners-connect.js';
import './listeners-msg.js';

configureSidePanelBehavior();
restoreCache();
