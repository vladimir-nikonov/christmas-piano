// Front camera: one shared video stream. The self-view window shows it; a future video-card recorder
// can take the same stream from getCamStream() instead of asking for the camera again.

let stream = null, pending = null;
const listeners = new Set();
// Calls cb(stream | null) whenever the camera starts or stops. Returns a function that removes the listener.
export function onCamChange(cb){ listeners.add(cb); return () => listeners.delete(cb); }
const emit = () => listeners.forEach(cb => cb(stream));
export const getCamStream = () => stream;
// Why the camera could not start: 'denied' (permission), 'missing' (no camera), 'busy' (used by another app) or 'other'.
function camErrorKind(e){
  const n = e && e.name;
  if (n === 'NotAllowedError' || n === 'PermissionDeniedError' || n === 'SecurityError') return 'denied';
  if (n === 'NotFoundError' || n === 'DevicesNotFoundError' || n === 'OverconstrainedError') return 'missing';
  if (n === 'NotReadableError' || n === 'TrackStartError' || n === 'AbortError') return 'busy';
  return 'other';
}
// Resolves to { ok:true } or { ok:false, kind }. Never rejects. Concurrent calls share one request.
export function startCamera(){
  if (stream) return Promise.resolve({ ok:true });
  if (pending) return pending;
  const req = (async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return { ok:false, kind:'other' };
      const s = await navigator.mediaDevices.getUserMedia({ audio:false, video:{ facingMode:'user', width:{ ideal:640 }, height:{ ideal:480 } } });
      // Stopped while the request was pending: release the camera at once.
      if (pending !== req){ s.getTracks().forEach(t => t.stop()); return { ok:false, kind:'other' }; }
      stream = s;
      s.getVideoTracks().forEach(t => t.addEventListener('ended', () => { if (stream === s){ stream = null; emit(); } }));
      emit();
      return { ok:true };
    } catch(e){ return { ok:false, kind: camErrorKind(e) }; }
  })();
  pending = req; req.then(() => { if (pending === req) pending = null; });
  return req;
}
// Turns the camera off (the light goes out) and forgets the stream.
export function stopCamera(){
  pending = null;
  if (!stream) return;
  stream.getTracks().forEach(t => t.stop()); stream = null; emit();
}
