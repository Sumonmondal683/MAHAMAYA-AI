/* Mahamaya AI — shared online crowd tracker.
   Crowd reports are stored by the same Node.js backend as the public gallery.
   Deploy the whole app on one persistent backend (Render/Railway/VPS). */
window.MAHAMAYA_CROWD_CONFIG = {
  backend: 'server',
  lang: 'bn',
  launcher: false,
  refreshSec: 30
};
