import { Component, OnDestroy, OnInit } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

interface Ticket {
  code: string;
  service: string;
  status: string;
  counter?: number | null;
}

interface Counter {
  id: number;
  status: 'available' | 'busy';
  ticket: string | null;
}

type View = 'reception' | 'staff' | 'counter' | 'clients';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  template: `
    <header class="topbar" [class.display-topbar]="isDisplay">
      <div class="brand"><div class="brand-mark">✚</div><div><strong>vida<span>lab</span></strong><small>LABORATORIO CLÍNICO</small></div></div>
      <nav aria-label="Navegación principal">
        <a [class.active]="mode==='reception'" (click)="setView('reception')">Recepción</a>
        <a [class.active]="mode==='staff'" (click)="setView('staff')">Ventanillas</a>
        <a [class.active]="mode==='counter'" (click)="setView('counter')">Pantalla de mesa</a>
        <a [class.active]="mode==='clients'" (click)="setView('clients')">Pantalla de clientes</a>
      </nav>
      <button class="staff-link" (click)="setView(mode==='staff' || isDisplay ? 'reception' : 'staff')">{{mode==='staff' || isDisplay ? 'Salir de pantalla' : 'Personal'}}</button>
    </header>

    <main [class.display-main]="isDisplay">
      <section class="hero" *ngIf="!isDisplay">
        <div class="hero-copy"><div class="eyebrow"><i></i> ATENCIÓN CON CALIDAD Y CALIDEZ</div><h1>Tu salud merece<br>una atención <em>sin esperas.</em></h1><p>Bienvenido a VidaLab. Genera tu turno y nuestro equipo te atenderá en breve.</p><div class="hero-meta"><span>◷ &nbsp;Lun – Vie, 7:00 a 18:00</span><span>⌖ &nbsp;Laboratorio clínico</span></div></div>
        <div class="hero-visual"><div class="circle circle-one"></div><div class="circle circle-two"></div><div class="sample">✚</div><div class="visual-label"><b>Tu bienestar,</b><br>nuestro compromiso</div></div>
      </section>

      <section class="content" *ngIf="mode==='reception'"><div class="section-heading"><div><span class="eyebrow">BIENVENIDO</span><h2>¿Qué necesitas hoy?</h2></div><div class="date-pill">● &nbsp;Sistema en línea</div></div><div class="grid">
        <article class="card new-ticket"><div class="card-icon">＋</div><h3>Genera tu turno</h3><p>Solicita un turno para ser atendido por nuestro equipo.</p><label for="service">Tipo de servicio</label><select id="service" [(ngModel)]="service"><option>Estudios de laboratorio</option><option>Toma de muestras</option><option>Entrega de resultados</option><option>Información general</option></select><button class="primary" (click)="createTicket()" [disabled]="busy">{{busy?'Generando…':'Obtener turno'}} <span>→</span></button><div class="ticket-result" *ngIf="created"><small>TU TURNO</small><strong>{{created}}</strong><span>Te llamaremos en pantalla</span></div></article>
        <article class="card board"><div class="board-head"><div><span class="eyebrow">EN ESTE MOMENTO</span><h3>Turnos en atención</h3></div><span class="live"><i></i> EN VIVO</span></div><div class="now-ticket"><div><small>AHORA PASA</small><strong>{{serving.length ? serving[serving.length-1].code : '— —'}}</strong></div><div class="arrow">→</div><div><small>VENTANILLA</small><strong>{{serving.length && serving[serving.length-1].counter ? '0'+serving[serving.length-1].counter : '—'}}</strong></div></div><h4>Próximos turnos</h4><div class="next-list"><div class="next-item" *ngFor="let t of waiting.slice(0,4); let i=index"><span class="queue-number">{{i+1}}</span><b>{{t.code}}</b><span>{{t.service}}</span><small>EN ESPERA</small></div><div class="empty" *ngIf="waiting.length===0">No hay turnos en espera</div></div><div class="board-foot">Mantente atento a la pantalla y al llamado de voz.</div></article>
      </div></section>

      <section class="content staff" *ngIf="mode==='staff'"><div class="section-heading"><div><span class="eyebrow">PANEL DEL PERSONAL</span><h2>Control de ventanillas</h2></div><button class="quiet" (click)="setView('reception')">← Volver a recepción</button></div><div class="counter-grid"><article class="counter-card" *ngFor="let c of counters"><div class="counter-top"><span>VENTANILLA 0{{c.id}}</span><span class="status" [class.busy-status]="c.status==='busy'">● {{c.status==='busy'?'OCUPADA':'DISPONIBLE'}}</span></div><div class="counter-ticket">{{c.ticket || '— —'}}</div><div class="counter-caption">{{c.ticket?'Turno en atención':c.status==='busy'?'No disponible':'Lista para atender'}}</div><button class="primary" *ngIf="c.status==='available'" (click)="callNext(c.id)" [disabled]="!waiting.length">Llamar siguiente <span>→</span></button><button class="finish" *ngIf="c.status==='busy'" (click)="complete(c.id)">✓ &nbsp; Atención finalizada · Disponible</button></article></div></section>

      <section class="content display-screen counter-screen" *ngIf="mode==='counter'">
        <div class="screen-heading"><div><span class="screen-eyebrow">PANTALLA DE ATENCIÓN</span><h1>Ventanilla 0{{selectedCounter}}</h1><p>Información en tiempo real para pacientes y personal.</p></div><div class="screen-actions"><button class="screen-sound" [class.enabled]="soundEnabled" (click)="enableSound()">{{soundEnabled?'♫ Sonido activado':'♫ Activar sonido'}}</button><span class="screen-live"><i></i> EN VIVO</span></div></div>
        <div class="counter-selector" aria-label="Elegir ventanilla"><span>VER MESA</span><button *ngFor="let c of counters" [class.selected]="selectedCounter===c.id" (click)="selectCounter(c.id)">0{{c.id}}</button></div>
        <div class="single-counter-board" [class.called]="ticketForCounter(selectedCounter)">
          <span class="board-label">{{ticketForCounter(selectedCounter) ? 'TURNO LLAMADO' : 'ESTADO DE LA VENTANILLA'}}</span>
          <strong class="single-ticket">{{ticketForCounter(selectedCounter)?.code || (counterFor(selectedCounter)?.status==='busy' ? 'OCUPADA' : '— —')}}</strong>
          <span class="single-status">{{ticketForCounter(selectedCounter) ? 'Favor de pasar a esta ventanilla' : (counterFor(selectedCounter)?.status==='busy' ? 'Esta ventanilla está temporalmente ocupada' : 'Disponible · En espera del siguiente turno')}}</span>
          <span class="called-service" *ngIf="ticketForCounter(selectedCounter)">{{ticketForCounter(selectedCounter)?.service}}</span>
        </div>
        <p class="display-hint">Por favor, confirma el número de tu turno y pasa cuando aparezca en pantalla.</p>
      </section>

      <section class="content display-screen clients-screen" *ngIf="mode==='clients'">
        <div class="screen-heading"><div><span class="screen-eyebrow">PANTALLA DE SALA DE ESPERA</span><h1>Turnos de atención</h1><p>Atención en tiempo real · Laboratorio VidaLab</p></div><div class="screen-actions"><button class="screen-sound" [class.enabled]="soundEnabled" (click)="enableSound()">{{soundEnabled?'♫ Sonido activado':'♫ Activar sonido'}}</button><span class="screen-live"><i></i> EN VIVO</span></div></div>
        <div class="clients-layout">
          <article class="next-call-panel"><span class="board-label">{{serving.length ? 'FAVOR DE PASAR' : 'PRÓXIMO TURNO'}}</span><strong>{{serving.length ? serving[serving.length-1].code : '— —'}}</strong><span>{{serving.length ? 'Ventanilla 0'+serving[serving.length-1].counter : 'En breve llamaremos tu turno'}}</span></article>
          <div class="public-counter-grid"><article class="public-counter" *ngFor="let c of counters" [class.public-busy]="c.status==='busy'"><span>VENTANILLA 0{{c.id}}</span><strong>{{ticketForCounter(c.id)?.code || '— —'}}</strong><small>{{ticketForCounter(c.id) ? 'PASE A ESTA VENTANILLA' : (c.status==='busy' ? 'OCUPADA' : 'DISPONIBLE')}}</small></article></div>
        </div>
        <div class="waiting-panel"><div class="waiting-heading"><div><span class="board-label">SIGUIENTES EN ESPERA</span><h2>Próximos turnos</h2></div><span class="waiting-count">{{waiting.length}} {{waiting.length===1?'persona':'personas'}}</span></div><div class="public-waiting-list"><div class="public-waiting-item" *ngFor="let t of waiting.slice(0,8); let i=index"><span class="queue-number">{{i+1}}</span><strong>{{t.code}}</strong><span>{{t.service}}</span><small>EN ESPERA</small></div><p class="public-empty" *ngIf="waiting.length===0">No hay turnos en espera. Gracias por tu paciencia.</p></div></div>
        <p class="display-hint">Escucha el llamado y revisa el número de ventanilla antes de pasar.</p>
      </section>

      <section class="bottom-strip" *ngIf="!isDisplay"><div><b>¿Tienes dudas?</b><span>Nuestro equipo está para ayudarte.</span></div><div class="strip-contact">☎ &nbsp; Atención en recepción</div><div class="strip-hours">✧ &nbsp; Resultados confiables, cuidado cercano</div></section>
    </main>
    <footer *ngIf="!isDisplay">© 2026 VidaLab · Laboratorio Clínico <span>Tu salud, nuestra prioridad</span></footer>
    <footer class="display-footer" *ngIf="isDisplay">VIDALAB · LABORATORIO CLÍNICO</footer>
    <div class="toast" *ngIf="message">{{message}}</div>
  `,
})
class App implements OnInit, OnDestroy {
  mode: View = 'reception';
  selectedCounter = 1;
  service = 'Estudios de laboratorio';
  busy = false;
  created = '';
  message = '';
  waiting: Ticket[] = [];
  serving: Ticket[] = [];
  counters: Counter[] = [];
  soundEnabled = false;
  private audio?: AudioContext;
  private refreshTimer?: ReturnType<typeof setInterval>;
  private messageTimer?: ReturnType<typeof setTimeout>;
  private hasSnapshot = false;
  private lastServingCodes: string[] = [];
  private announcementQueue: string[] = [];
  private speaking = false;

  constructor(private http: HttpClient) {}

  get isDisplay(): boolean {
    return this.mode === 'counter' || this.mode === 'clients';
  }

  ngOnInit(): void {
    this.readViewFromLocation();
    this.refresh();
    this.refreshTimer = setInterval(() => this.refresh(), 3000);
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    if (this.messageTimer) clearTimeout(this.messageTimer);
  }

  setView(view: View): void {
    this.mode = view;
    if (this.isDisplay) this.unlockSound();
    this.syncLocation();
  }

  selectCounter(id: number): void {
    this.selectedCounter = id;
    this.syncLocation();
  }

  private readViewFromLocation(): void {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('vista');
    if (view === 'mesa') {
      this.mode = 'counter';
      const counter = Number(params.get('ventanilla'));
      this.selectedCounter = Number.isInteger(counter) && counter >= 1 && counter <= 4 ? counter : 1;
    } else if (view === 'clientes') {
      this.mode = 'clients';
    } else if (view === 'personal') {
      this.mode = 'staff';
    }
  }

  private syncLocation(): void {
    const params = new URLSearchParams(window.location.search);
    params.delete('vista');
    params.delete('ventanilla');
    if (this.mode === 'counter') {
      params.set('vista', 'mesa');
      params.set('ventanilla', String(this.selectedCounter));
    } else if (this.mode === 'clients') {
      params.set('vista', 'clientes');
    } else if (this.mode === 'staff') {
      params.set('vista', 'personal');
    }
    const query = params.toString();
    window.history.replaceState({}, '', window.location.pathname + (query ? `?${query}` : '') + window.location.hash);
  }

  refresh(): void {
    this.http.get<any>('/api/state').subscribe({
      next: (state) => {
        const nextServing: Ticket[] = state.serving || [];
        if (this.hasSnapshot && this.isDisplay) {
          const newCalls = nextServing.filter((ticket) => !this.lastServingCodes.includes(ticket.code));
          const callsForThisScreen = this.mode === 'counter'
            ? newCalls.filter((ticket) => ticket.counter === this.selectedCounter)
            : newCalls;
          callsForThisScreen.forEach((ticket) => this.enqueueAnnouncement(`Turno ${ticket.code}, favor de pasar a ventanilla ${ticket.counter}`));
        }
        this.lastServingCodes = nextServing.map((ticket) => ticket.code);
        this.hasSnapshot = true;
        this.waiting = state.waiting || [];
        this.serving = nextServing;
        this.counters = state.counters || [];
      },
      error: () => {},
    });
  }

  counterFor(id: number): Counter | undefined {
    return this.counters.find((counter) => counter.id === id);
  }

  ticketForCounter(id: number): Ticket | undefined {
    return this.serving.find((ticket) => ticket.counter === id);
  }

  createTicket(): void {
    this.busy = true;
    this.http.post<Ticket>('/api/tickets', { service: this.service }).subscribe({
      next: (ticket) => {
        this.created = ticket.code;
        this.busy = false;
        this.refresh();
        this.say(`Tu turno es ${ticket.code}`);
      },
      error: () => {
        this.busy = false;
        this.notify('No se pudo generar el turno. Revisa que la API esté disponible.');
      },
    });
  }

  callNext(id: number): void {
    this.http.post<Ticket>(`/api/counters/${id}/call-next`, {}).subscribe({
      next: (ticket) => {
        this.refresh();
        this.say(`Turno ${ticket.code}, favor de pasar a ventanilla ${id}`);
        this.beep();
      },
      error: () => this.notify('No hay turnos en espera.'),
    });
  }

  complete(id: number): void {
    this.http.post('/api/counters/' + id + '/complete', {}).subscribe({
      next: () => {
        this.refresh();
        this.beep();
        this.notify('Ventanilla disponible. Puede pasar el siguiente turno.');
      },
      error: () => this.notify('No se pudo actualizar la ventanilla.'),
    });
  }

  private enqueueAnnouncement(text: string): void {
    if (!this.soundEnabled) return;
    this.announcementQueue.push(text);
    this.beep();
    this.speakNext();
  }

  private speakNext(): void {
    if (this.speaking || !this.announcementQueue.length || !('speechSynthesis' in window)) return;
    this.speaking = true;
    const utterance = new SpeechSynthesisUtterance(this.announcementQueue.shift()!);
    utterance.onend = () => {
      this.speaking = false;
      this.speakNext();
    };
    utterance.onerror = () => {
      this.speaking = false;
      this.speakNext();
    };
    speechSynthesis.speak(utterance);
  }

  private say(text: string): void {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      speechSynthesis.speak(new SpeechSynthesisUtterance(text));
    }
  }

  private beep(): void {
    try {
      this.audio ??= new AudioContext();
      const oscillator = this.audio.createOscillator();
      const gain = this.audio.createGain();
      oscillator.connect(gain);
      gain.connect(this.audio.destination);
      oscillator.frequency.value = 880;
      gain.gain.value = 0.12;
      oscillator.start();
      oscillator.stop(this.audio.currentTime + 0.22);
    } catch {}
  }

  enableSound(): void {
    this.unlockSound();
    this.beep();
  }

  private unlockSound(): void {
    try {
      this.audio ??= new AudioContext();
      void this.audio.resume();
      this.soundEnabled = true;
    } catch {}
  }

  private notify(text: string): void {
    this.message = text;
    if (this.messageTimer) clearTimeout(this.messageTimer);
    this.messageTimer = setTimeout(() => (this.message = ''), 3500);
  }
}

bootstrapApplication(App, { providers: [] }).catch((error) => console.error(error));
