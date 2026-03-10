/* ════════════════════════════════════════════════
   SKILLX — LIVE CLASSES
   WebRTC + Socket.IO Client
════════════════════════════════════════════════ */

const socket = io();

// ── STATE ─────────────────────────────────────
let myName       = '';
let myRoomId     = '';
let mySocketId   = '';
let isHost       = false;
let localStream  = null;
let screenStream = null;
let peers        = {};   // peerId → RTCPeerConnection
let peerNames    = {};   // peerId → name
let micEnabled   = true;
let camEnabled   = true;
let screenSharing = false;
let handRaised   = false;
let chatUnread   = 0;
let timerInterval = null;
let timerSeconds = 0;
let chatOpen     = false;
let participantsOpen = false;

// ICE STUN servers (public)
const iceConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ]
};

// ── LOBBY ─────────────────────────────────────
function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.querySelector(`[onclick="switchTab('${tab}')"]`).classList.add('active');
  document.getElementById(`tab-${tab}`).classList.add('active');
  clearError();
}

function showError(msg) {
  document.getElementById('lobbyError').textContent = msg;
}
function clearError() {
  document.getElementById('lobbyError').textContent = '';
}

async function createRoom() {
  const name  = document.getElementById('userName').value.trim();
  const title = document.getElementById('sessionTitle').value.trim();
  if (!name) { showError('Please enter your name.'); return; }

  myName = name;
  isHost = true;

  // Get camera/mic first
  const ok = await initLocalStream();
  if (!ok) return;

  socket.emit('create-room', { name, title });
}

async function joinRoom() {
  const name    = document.getElementById('userName').value.trim();
  const roomId  = document.getElementById('meetingId').value.trim().toUpperCase();
  if (!name)   { showError('Please enter your name.'); return; }
  if (!roomId) { showError('Please enter a Meeting ID.'); return; }

  myName = name;
  isHost = false;

  const ok = await initLocalStream();
  if (!ok) return;

  socket.emit('join-room', { roomId, name });
}

// ── LOCAL STREAM ──────────────────────────────
async function initLocalStream() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    return true;
  } catch (e) {
    if (e.name === 'NotAllowedError') {
      showError('⚠️ Camera/Mic permission denied. Please allow access and try again.');
    } else if (e.name === 'NotFoundError') {
      // Try audio only
      try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
        camEnabled = false;
        return true;
      } catch {
        showError('⚠️ No camera/mic found.');
      }
    } else {
      showError('⚠️ Could not access camera/mic: ' + e.message);
    }
    return false;
  }
}

// ── ENTER ROOM ────────────────────────────────
function enterRoom(roomId, title) {
  myRoomId = roomId;
  document.getElementById('roomIdDisplay').textContent = roomId;
  document.getElementById('sessionTitleDisplay').textContent = title || 'Live Class';

  if (isHost) {
    document.getElementById('endMeetingBtn').style.display = 'flex';
  }

  showScreen('room');
  addLocalTile();
  startTimer();

  // Notification area
  if (!document.getElementById('notifContainer')) {
    const nc = document.createElement('div');
    nc.id = 'notifContainer';
    document.body.appendChild(nc);
  }
}

// ── VIDEO TILES ───────────────────────────────
function addLocalTile() {
  const tile = createTile('local', myName, true, isHost);
  const video = tile.querySelector('video');
  if (localStream) {
    video.srcObject = localStream;
    const hasVideo = localStream.getVideoTracks().length > 0;
    video.style.display = hasVideo ? 'block' : 'none';
    tile.querySelector('.v-avatar').style.display = hasVideo ? 'none' : 'flex';
  }
  document.getElementById('videoGrid').appendChild(tile);
  updateGridLayout();
}

function addRemoteTile(peerId, peerName, peerIsHost) {
  const existing = document.getElementById(`tile-${peerId}`);
  if (existing) return;
  const tile = createTile(peerId, peerName, false, peerIsHost);
  document.getElementById('videoGrid').appendChild(tile);
  updateGridLayout();
}

function createTile(id, name, isLocal, isHostUser) {
  const tile = document.createElement('div');
  tile.className = `v-tile${isLocal ? ' local-tile' : ''}`;
  tile.id = `tile-${id}`;

  const initial = name.charAt(0).toUpperCase();

  tile.innerHTML = `
    <video autoplay playsinline ${isLocal ? 'muted' : ''}></video>
    <div class="v-avatar">
      <div class="v-avatar-circle">${initial}</div>
      <div class="v-avatar-name">${name}</div>
    </div>
    <div class="v-label">
      ${isHostUser ? '<span class="host-tag">HOST</span>' : ''}
      ${name}${isLocal ? ' (You)' : ''}
    </div>
    <div class="v-muted" id="muted-${id}">🔇</div>
    <div class="v-hand"  id="hand-${id}">✋</div>
  `;
  return tile;
}

function removeTile(peerId) {
  const tile = document.getElementById(`tile-${peerId}`);
  if (tile) tile.remove();
  updateGridLayout();
}

function updateGridLayout() {
  const grid  = document.getElementById('videoGrid');
  const count = grid.children.length;
  grid.className = `video-grid count-${Math.min(count, 9)}`;
}

function setRemoteStream(peerId, stream) {
  const tile  = document.getElementById(`tile-${peerId}`);
  if (!tile) return;
  const video = tile.querySelector('video');
  const avtr  = tile.querySelector('.v-avatar');
  video.srcObject = stream;
  const hasVideo = stream.getVideoTracks().some(t => t.enabled);
  video.style.display = hasVideo ? 'block' : 'none';
  avtr.style.display  = hasVideo ? 'none'  : 'flex';
}

// ── WebRTC PEER CONNECTIONS ───────────────────
async function createPeerConnection(peerId, isInitiator) {
  const pc = new RTCPeerConnection(iceConfig);
  peers[peerId] = pc;

  // Add local tracks
  if (localStream) {
    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
  }

  // Remote stream
  const remoteStream = new MediaStream();
  pc.ontrack = (e) => {
    e.streams[0].getTracks().forEach(track => remoteStream.addTrack(track));
    setRemoteStream(peerId, remoteStream);
  };

  // ICE candidates
  pc.onicecandidate = (e) => {
    if (e.candidate) {
      socket.emit('ice-candidate', { targetId: peerId, candidate: e.candidate });
    }
  };

  // Connection state monitoring
  pc.onconnectionstatechange = () => {
    console.log(`Peer ${peerId}: ${pc.connectionState}`);
    if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
      // Auto reconnect
      setTimeout(() => {
        if (peers[peerId] && peers[peerId].connectionState !== 'connected') {
          reconnectPeer(peerId);
        }
      }, 3000);
    }
  };

  // If initiator, create offer
  if (isInitiator) {
    try {
      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
      await pc.setLocalDescription(offer);
      socket.emit('offer', { targetId: peerId, offer, name: myName });
    } catch (e) {
      console.error('Offer error:', e);
    }
  }

  return pc;
}

async function reconnectPeer(peerId) {
  if (peers[peerId]) {
    peers[peerId].close();
    delete peers[peerId];
  }
  if (peerNames[peerId]) {
    await createPeerConnection(peerId, true);
  }
}

// ── SOCKET EVENTS ─────────────────────────────
socket.on('connect', () => {
  mySocketId = socket.id;
});

socket.on('room-created', async ({ roomId, title }) => {
  enterRoom(roomId, title);
  showToast(`Room created — ID: ${roomId}`);
});

socket.on('room-joined', async ({ roomId, title, existingPeers, isHost: iH }) => {
  isHost = iH;
  enterRoom(roomId, title);
  // Connect to each existing peer (we initiate)
  for (const { peerId, name, isHost: ph } of existingPeers) {
    peerNames[peerId] = name;
    addRemoteTile(peerId, name, ph);
    await createPeerConnection(peerId, true);
  }
});

socket.on('user-joined', async ({ peerId, name, isHost: ph }) => {
  peerNames[peerId] = name;
  addRemoteTile(peerId, name, ph);
  // They will send us offer — we wait
  showNotif(`${name} joined 👋`);
  addSystemChat(`${name} joined the session`);
});

socket.on('user-left', ({ peerId, name }) => {
  if (peers[peerId]) { peers[peerId].close(); delete peers[peerId]; }
  delete peerNames[peerId];
  removeTile(peerId);
  showNotif(`${name} left`);
  addSystemChat(`${name} left the session`);
  updateParticipantsPanel();
});

socket.on('participants-update', ({ participants }) => {
  document.getElementById('participantCount').textContent = `👥 ${participants.length}`;
  updateParticipantsPanel(participants);
});

// WebRTC signaling
socket.on('offer', async ({ from, name, offer }) => {
  peerNames[from] = name;
  if (!document.getElementById(`tile-${from}`)) {
    addRemoteTile(from, name, false);
  }
  const pc = await createPeerConnection(from, false);
  await pc.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  socket.emit('answer', { targetId: from, answer });
});

socket.on('answer', async ({ from, answer }) => {
  const pc = peers[from];
  if (pc && pc.signalingState !== 'stable') {
    await pc.setRemoteDescription(new RTCSessionDescription(answer));
  }
});

socket.on('ice-candidate', async ({ from, candidate }) => {
  const pc = peers[from];
  if (pc) {
    try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); }
    catch (e) { console.warn('ICE error:', e); }
  }
});

// Screen share events
socket.on('screen-share-start', ({ from }) => {
  showNotif(`${peerNames[from] || 'Someone'} started screen sharing 🖥`);
});

socket.on('screen-share-stop', ({ from }) => {
  showNotif(`${peerNames[from] || 'Someone'} stopped screen sharing`);
});

// Chat
socket.on('chat-message', ({ from, name, message, timestamp }) => {
  addChatMessage(name, message, timestamp, from === mySocketId);
  if (!chatOpen) {
    chatUnread++;
    const badge = document.getElementById('chatBadge');
    badge.textContent = chatUnread;
    badge.style.display = 'block';
  }
});

// Peer media state
socket.on('peer-media-state', ({ peerId, video, audio }) => {
  const mutedEl = document.getElementById(`muted-${peerId}`);
  if (mutedEl) mutedEl.classList.toggle('show', !audio);
  const tile  = document.getElementById(`tile-${peerId}`);
  if (tile) {
    const vid = tile.querySelector('video');
    const avt = tile.querySelector('.v-avatar');
    if (vid.srcObject) {
      vid.style.display = video ? 'block' : 'none';
      avt.style.display = video ? 'none'  : 'flex';
    }
  }
});

// Hand raise
socket.on('peer-hand-raise', ({ peerId, name, raised }) => {
  const handEl = document.getElementById(`hand-${peerId}`);
  if (handEl) handEl.classList.toggle('show', raised);
  if (raised) showNotif(`${name} raised their hand ✋`);
});

// Meeting ended
socket.on('meeting-ended', () => {
  cleanup();
  document.getElementById('endedMessage').textContent = 'The session has been ended by the host.';
  showScreen('ended');
});

socket.on('error', ({ message }) => {
  showError(message);
});

// ── MIC / CAM CONTROLS ────────────────────────
function toggleMic() {
  if (!localStream) return;
  micEnabled = !micEnabled;
  localStream.getAudioTracks().forEach(t => t.enabled = micEnabled);
  const btn = document.getElementById('micCtrl');
  document.getElementById('micIcon').textContent  = micEnabled ? '🎙' : '🔇';
  document.getElementById('micLabel').textContent = micEnabled ? 'Mute' : 'Unmute';
  btn.className = `ctrl-btn${micEnabled ? '' : ' off'}`;
  document.getElementById('muted-local').classList.toggle('show', !micEnabled);
  socket.emit('media-state', { roomId: myRoomId, video: camEnabled, audio: micEnabled });
  showToast(micEnabled ? '🎙 Mic on' : '🔇 Mic muted');
}

function toggleCamera() {
  if (!localStream) return;
  camEnabled = !camEnabled;
  localStream.getVideoTracks().forEach(t => t.enabled = camEnabled);
  const tile  = document.getElementById('tile-local');
  const video = tile?.querySelector('video');
  const avtr  = tile?.querySelector('.v-avatar');
  if (video) video.style.display = camEnabled ? 'block' : 'none';
  if (avtr)  avtr.style.display  = camEnabled ? 'none'  : 'flex';
  const btn = document.getElementById('camCtrl');
  document.getElementById('camIcon').textContent  = camEnabled ? '📷' : '🚫';
  document.getElementById('camLabel').textContent = camEnabled ? 'Camera' : 'Cam Off';
  btn.className = `ctrl-btn${camEnabled ? '' : ' off'}`;
  socket.emit('media-state', { roomId: myRoomId, video: camEnabled, audio: micEnabled });
  showToast(camEnabled ? '📷 Camera on' : '📷 Camera off');
}

// ── SCREEN SHARE ──────────────────────────────
async function toggleScreenShare() {
  if (!screenSharing) {
    try {
      screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });

      // Replace video track in all peer connections
      const screenTrack = screenStream.getVideoTracks()[0];
      Object.values(peers).forEach(pc => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(screenTrack);
      });

      // Show screen share view
      const ssView = document.getElementById('screenShareView');
      const ssVideo = document.getElementById('screenShareVideo');
      ssVideo.srcObject = screenStream;
      ssView.style.display = 'flex';

      // Show local cam in PiP
      const pip = document.getElementById('pipWrap');
      const pipVid = document.getElementById('pipVideo');
      pipVid.srcObject = localStream;
      pip.style.display = 'block';

      screenSharing = true;
      document.getElementById('screenCtrl').classList.add('active-btn');
      document.getElementById('screenLabel').textContent = 'Stop Share';
      socket.emit('screen-share-start', { roomId: myRoomId });
      showToast('🖥 Screen sharing started');

      screenTrack.onended = () => stopScreenShare();
    } catch (e) {
      if (e.name !== 'NotAllowedError') {
        showToast('⚠️ Screen share failed');
      }
    }
  } else {
    stopScreenShare();
  }
}

function stopScreenShare() {
  if (screenStream) { screenStream.getTracks().forEach(t => t.stop()); screenStream = null; }

  // Restore camera track in peers
  if (localStream) {
    const camTrack = localStream.getVideoTracks()[0];
    Object.values(peers).forEach(pc => {
      const sender = pc.getSenders().find(s => s.track?.kind === 'video');
      if (sender && camTrack) sender.replaceTrack(camTrack);
    });
  }

  document.getElementById('screenShareView').style.display = 'none';
  document.getElementById('pipWrap').style.display = 'none';
  screenSharing = false;
  document.getElementById('screenCtrl').classList.remove('active-btn');
  document.getElementById('screenLabel').textContent = 'Share';
  socket.emit('screen-share-stop', { roomId: myRoomId });
  showToast('🖥 Screen sharing stopped');
}

// ── HAND RAISE ────────────────────────────────
function toggleHandRaise() {
  handRaised = !handRaised;
  const btn = document.getElementById('handCtrl');
  btn.classList.toggle('raised', handRaised);
  const handEl = document.getElementById('hand-local');
  if (handEl) handEl.classList.toggle('show', handRaised);
  socket.emit('raise-hand', { roomId: myRoomId, name: myName, raised: handRaised });
  showToast(handRaised ? '✋ Hand raised' : 'Hand lowered');
}

// ── CHAT ──────────────────────────────────────
function sendChat() {
  const inp = document.getElementById('chatInput');
  const msg = inp.value.trim();
  if (!msg) return;
  socket.emit('chat-message', { roomId: myRoomId, message: msg, name: myName });
  inp.value = '';
}

function addChatMessage(name, text, timestamp, isOwn) {
  const msgs = document.getElementById('chatMessages');
  const div  = document.createElement('div');
  div.className = 'chat-msg';
  div.innerHTML = `
    <div class="chat-msg-header">
      <span class="chat-msg-name${isOwn ? ' own' : ''}">${name}</span>
      <span class="chat-msg-time">${timestamp}</span>
    </div>
    <div class="chat-msg-text">${escapeHtml(text)}</div>
  `;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function addSystemChat(text) {
  const msgs = document.getElementById('chatMessages');
  const div  = document.createElement('div');
  div.className = 'chat-msg system';
  div.innerHTML = `<div class="chat-msg-text">${text}</div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

// ── PANELS ────────────────────────────────────
function togglePanel(panel) {
  const sp   = document.getElementById('sidePanel');
  const pPanel = document.getElementById('participantsPanel');
  const cPanel = document.getElementById('chatPanel');
  const pBtn = document.getElementById('participantsToggle');
  const cBtn = document.getElementById('chatToggle');

  if (panel === 'chat') {
    const opening = !chatOpen;
    chatOpen = opening;
    participantsOpen = false;
    cPanel.style.display = opening ? 'flex' : 'none';
    pPanel.style.display = 'none';
    sp.style.display     = opening ? 'flex' : 'none';
    cBtn.classList.toggle('active', opening);
    pBtn.classList.remove('active');
    if (opening) {
      chatUnread = 0;
      document.getElementById('chatBadge').style.display = 'none';
    }
  } else {
    const opening = !participantsOpen;
    participantsOpen = opening;
    chatOpen = false;
    pPanel.style.display = opening ? 'flex' : 'none';
    cPanel.style.display = 'none';
    sp.style.display     = opening ? 'flex' : 'none';
    pBtn.classList.toggle('active', opening);
    cBtn.classList.remove('active');
  }
}

function updateParticipantsPanel(participants) {
  const list = document.getElementById('participantsList');
  if (!participants) return;
  list.innerHTML = participants.map(p => `
    <div class="participant-item">
      <div class="p-avatar">${p.name.charAt(0).toUpperCase()}</div>
      <div class="p-name">${p.name}</div>
      <div class="p-tags">
        ${p.isHost ? '<span class="p-tag">HOST</span>' : ''}
        ${p.peerId === mySocketId ? '<span class="p-tag you">YOU</span>' : ''}
      </div>
    </div>
  `).join('');
}

// ── LEAVE / END ───────────────────────────────
function leaveRoom() {
  cleanup();
  socket.disconnect();
  document.getElementById('endedMessage').textContent = 'You have left the session.';
  showScreen('ended');
}

function endMeeting() {
  if (!isHost) return;
  socket.emit('end-meeting', { roomId: myRoomId });
  cleanup();
  document.getElementById('endedMessage').textContent = 'You ended the session.';
  showScreen('ended');
}

function cleanup() {
  // Stop all media
  if (localStream)  { localStream.getTracks().forEach(t => t.stop());  localStream = null; }
  if (screenStream) { screenStream.getTracks().forEach(t => t.stop()); screenStream = null; }
  // Close all peer connections
  Object.values(peers).forEach(pc => pc.close());
  peers = {}; peerNames = {};
  // Stop timer
  clearInterval(timerInterval);
  // Clear video grid
  document.getElementById('videoGrid').innerHTML = '';
}

function goToLobby() {
  // Reset form
  document.getElementById('userName').value = '';
  document.getElementById('meetingId').value = '';
  document.getElementById('sessionTitle').value = '';
  clearError();
  socket.connect();
  showScreen('lobby');
}

// ── UTILS ─────────────────────────────────────
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(name).classList.add('active');
}

function startTimer() {
  timerSeconds = 0;
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timerSeconds++;
    const m  = String(Math.floor(timerSeconds / 60)).padStart(2, '0');
    const sc = String(timerSeconds % 60).padStart(2, '0');
    document.getElementById('sessionTimer').textContent = `${m}:${sc}`;
  }, 1000);
}

function copyRoomId() {
  const id = document.getElementById('roomIdDisplay').textContent;
  navigator.clipboard.writeText(id).then(() => showToast('📋 Meeting ID copied!'));
}

let toastTimer = null;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
}

function showNotif(msg) {
  const nc = document.getElementById('notifContainer');
  if (!nc) return;
  const n = document.createElement('div');
  n.className = 'notif'; n.textContent = msg;
  nc.appendChild(n);
  setTimeout(() => n.remove(), 3200);
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}