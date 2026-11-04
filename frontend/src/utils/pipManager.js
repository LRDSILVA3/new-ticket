// Floating Queue Scoreboard (Picture-in-Picture) & Web Notifications Manager
import { soundManager } from './sound';

class PiPManager {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.video = null;
    this.stream = null;
    this.pipActive = false;
    this.animFrame = null;
    this.currentData = null;
    this.flashState = false;
  }

  isSupported() {
    if (typeof window === 'undefined') return false;
    return (
      ('documentPictureInPicture' in window) ||
      (document.pictureInPictureEnabled && !!HTMLVideoElement.prototype.requestPictureInPicture)
    );
  }

  async requestNotificationPermission() {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    if (Notification.permission === 'granted') return 'granted';
    try {
      const res = await Notification.requestPermission();
      return res;
    } catch {
      return 'denied';
    }
  }

  sendNotification(title, options = {}) {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      try {
        const notif = new Notification(title, {
          icon: '/favicon.svg',
          badge: '/favicon.svg',
          vibrate: [300, 150, 300, 150, 500],
          requireInteraction: true,
          ...options
        });
        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      } catch (e) {
        console.warn('[PiP] Notification failed:', e);
      }
    }
  }

  // Draw the floating scoreboard on a high-DPI canvas
  drawCard(data) {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    const ticket = data?.ticket || {};
    const tenant = data?.tenant || {};
    const waitInfo = data?.waitInfo || {};
    const isCalled = ticket.status === 'called';

    // Background gradient
    if (isCalled) {
      this.flashState = !this.flashState;
      ctx.fillStyle = this.flashState ? '#b91c1c' : '#7f1d1d';
    } else {
      ctx.fillStyle = '#090d16';
    }
    ctx.fillRect(0, 0, w, h);

    // Inner rounded container border
    ctx.lineWidth = 4;
    ctx.strokeStyle = isCalled ? '#ef4444' : '#1e293b';
    ctx.strokeRect(4, 4, w - 8, h - 8);

    if (isCalled) {
      // --- CALLED STATE (High alert) ---
      // Top header bar
      ctx.fillStyle = '#fef2f2';
      ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🚨 É A SUA VEZ! 🚨', w / 2, 45);

      // Huge ticket code
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 68px monospace';
      ctx.fillText(ticket.display_code || '---', w / 2, 120);

      // Counter / Room
      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 26px system-ui, -apple-system, sans-serif';
      const counterText = ticket.assigned_counter ? `DIRIJA-SE AO: ${ticket.assigned_counter.toUpperCase()}` : 'DIRIJA-SE AO GUICHÊ';
      ctx.fillText(counterText, w / 2, 165);

      // Subtitle
      ctx.fillStyle = '#fee2e2';
      ctx.font = '18px system-ui, -apple-system, sans-serif';
      ctx.fillText(`Paciente: ${ticket.customer_name || 'Paciente'}`, w / 2, 205);
    } else {
      // --- WAITING QUEUE STATE ---
      // Top bar: Clinic Name + status pill
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(30, 32, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText((tenant.name || 'NextQueue').slice(0, 26), 46, 38);

      ctx.fillStyle = '#38bdf8';
      ctx.textAlign = 'right';
      ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
      ctx.fillText('AO VIVO 🟢', w - 24, 38);

      // Big Ticket Code in Center
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 62px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(ticket.display_code || '---', 28, 115);

      // Waiting metrics badge on right side
      ctx.fillStyle = '#1e293b';
      this.roundRect(ctx, w - 200, 60, 175, 75, 12);
      ctx.fill();

      // Position
      ctx.fillStyle = '#2dd4bf';
      ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      const pos = waitInfo.positionInQueue || 1;
      ctx.fillText(`${pos}º na Fila`, w - 112, 92);

      // Estimated Time
      ctx.fillStyle = '#94a3b8';
      ctx.font = '16px system-ui, -apple-system, sans-serif';
      const waitTime = waitInfo.estimatedWaitMinutes || 10;
      ctx.fillText(`~${waitTime} min de espera`, w - 112, 120);

      // Bottom bar: Patient Name & Current Stage
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(4, h - 55, w - 8, 51);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`👤 ${ticket.customer_name || 'Paciente'}`, 24, h - 22);

      ctx.fillStyle = '#38bdf8';
      ctx.textAlign = 'right';
      const stageName = waitInfo.currentStage?.name || 'Aguardando Atendimento';
      ctx.fillText(stageName.slice(0, 22), w - 24, h - 22);
    }
  }

  roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  // Start PiP floating scoreboard
  async enableFloatingBadge(initialData) {
    this.currentData = initialData;

    // 1. Request Notification permission in background
    this.requestNotificationPermission().then(status => {
      if (status === 'granted') {
        this.sendNotification('📌 Balão Flutuante Ativo!', {
          body: `Sua senha ${initialData?.ticket?.display_code} está sendo acompanhada. Avisaremos aqui quando for sua vez!`,
          tag: 'pip-active'
        });
      }
    });

    // 2. Initialize sound manager so audio is primed
    soundManager.init();

    // 3. Setup canvas & video stream
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.canvas.width = 460;
      this.canvas.height = 230;
      this.ctx = this.canvas.getContext('2d');
    }

    this.drawCard(this.currentData);

    if (!this.video) {
      this.video = document.createElement('video');
      this.video.muted = true;
      this.video.playsInline = true;
      this.video.setAttribute('playsinline', '');
      this.video.setAttribute('muted', '');
      this.video.style.position = 'fixed';
      this.video.style.opacity = '0.001';
      this.video.style.pointerEvents = 'none';
      this.video.style.width = '10px';
      this.video.style.height = '10px';
      document.body.appendChild(this.video);
    }

    // Stream from canvas at 3 FPS (battery-friendly for mobile)
    this.stream = this.canvas.captureStream(3);
    this.video.srcObject = this.stream;

    await this.video.play();

    // Request Picture in Picture
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture().catch(() => {});
    }

    await this.video.requestPictureInPicture();
    this.pipActive = true;

    // Start render loop
    this.startLoop();

    this.video.addEventListener('leavepictureinpicture', () => {
      this.pipActive = false;
      this.stopLoop();
    }, { once: true });

    return true;
  }

  startLoop() {
    this.stopLoop();
    const interval = 800; // redrawn periodically
    this.timer = setInterval(() => {
      if (this.currentData) {
        this.drawCard(this.currentData);
      }
    }, interval);
  }

  stopLoop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  updateData(newData) {
    this.currentData = newData;
    this.drawCard(newData);

    // If ticket status is called, trigger system notification as well
    if (newData?.ticket?.status === 'called') {
      const displayCode = newData.ticket.display_code || '';
      const counter = newData.ticket.assigned_counter || 'o guichê';
      this.sendNotification(`🚨 É A SUA VEZ! (${displayCode})`, {
        body: `Dirija-se imediatamente para ${counter}!`,
        tag: 'ticket-called',
        requireInteraction: true
      });
    }
  }

  stopPiP() {
    this.stopLoop();
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(() => {});
    }
    this.pipActive = false;
  }
}

export const pipManager = new PiPManager();

