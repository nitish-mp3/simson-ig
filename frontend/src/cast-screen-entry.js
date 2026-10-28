import {SimsonRoomDisplayCard} from './room-display-card.js';

if (!customElements.get('simson-cast-room-screen')) {
  customElements.define('simson-cast-room-screen', class extends SimsonRoomDisplayCard {});
}
