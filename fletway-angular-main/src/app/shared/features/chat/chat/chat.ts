import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../data-access/chat-service';
import { MensajeConUsuario } from '../../../../core/layouts/mensaje';
import { AuthService } from '../../../../core/auth/data-access/auth-service';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.html',
  styleUrl: './chat.scss',
})
export class ChatComponent implements OnInit, OnDestroy {
  @Input() solicitudId!: number;

  private chatService = inject(ChatService);
  private authService = inject(AuthService);

  // Signals
  mensajes = this.chatService.mensajes;
  loading = this.chatService.loading;
  currentUserId = signal<string | null>(null);

  // Estado del componente
  nuevoMensaje = '';
  mensajeEditando = signal<MensajeConUsuario | null>(null);
  textoEditado = '';
  mostrarSkeletons = signal<boolean>(true);

  // Computed
  hayMensajes = computed(() => this.mensajes().mensajes.length > 0);
  puedeEnviar = computed(() => this.nuevoMensaje.trim().length > 0);

  async ngOnInit(): Promise<void> {
    console.log('💬 Iniciando ChatComponent para solicitud:', this.solicitudId);

    // Obtener usuario actual
    const {
      data: { session },
    } = await this.authService.session();

    if (session?.user?.id) {
      this.currentUserId.set(session.user.id);

      // Cargar mensajes
      await this.chatService.cargarMensajes(this.solicitudId, session.user.id);

      // Ocultar skeleton después de cargar
      setTimeout(() => this.mostrarSkeletons.set(false), 500);
    }
  }

  ngOnDestroy(): void {
    this.chatService.limpiarChat();
  }

  /**
   * Envía un mensaje nuevo
   */
  async enviarMensaje(): Promise<void> {
    const texto = this.nuevoMensaje.trim();
    if (!texto || !this.currentUserId()) return;

    const exito = await this.chatService.enviarMensaje(
      this.solicitudId,
      texto,
      this.currentUserId()!,
    );

    if (exito) {
      this.nuevoMensaje = '';
      this.scrollAlFinal();
    }
  }

  /**
   * Inicia la edición de un mensaje
   */
  iniciarEdicion(mensaje: MensajeConUsuario): void {
    this.mensajeEditando.set(mensaje);
    this.textoEditado = mensaje.mensaje;
  }

  /**
   * Cancela la edición
   */
  cancelarEdicion(): void {
    this.mensajeEditando.set(null);
    this.textoEditado = '';
  }

  /**
   * Guarda la edición del mensaje
   */
  async guardarEdicion(): Promise<void> {
    const mensaje = this.mensajeEditando();
    const nuevoTexto = this.textoEditado.trim();

    if (!mensaje || !nuevoTexto) return;

    const exito = await this.chatService.editarMensaje(mensaje.id, nuevoTexto);

    if (exito) {
      this.cancelarEdicion();
    }
  }

  /**
   * Elimina un mensaje
   */
  async eliminarMensaje(mensaje: MensajeConUsuario): Promise<void> {
    if (confirm('¿Estás seguro de eliminar este mensaje?')) {
      await this.chatService.eliminarMensaje(mensaje.id);
    }
  }

  /**
   * Verifica si un mensaje puede ser editado/eliminado
   */
  puedeModificar(mensaje: MensajeConUsuario): boolean {
    // Solo el autor puede modificar sus mensajes
    // Y solo si el otro usuario no ha enviado mensajes después
    return mensaje.esMio;
  }

  /**
   * Verifica si el otro usuario ha enviado mensajes
   */
  otroUsuarioHaRespondido(): boolean {
    const mensajes = this.mensajes().mensajes;
    return mensajes.some((m) => !m.esMio);
  }

  /**
   * Formatea la fecha del mensaje
   */
  formatearFecha(fecha: string): string {
    const date = new Date(fecha);
    const hoy = new Date();
    const esHoy = date.toDateString() === hoy.toDateString();

    if (esHoy) {
      return date.toLocaleTimeString('es-AR', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else {
      return date.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  }

  /**
   * Scroll automático al final del chat
   */
  private scrollAlFinal(): void {
    setTimeout(() => {
      const chatContainer = document.getElementById('chat-messages');
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }, 100);
  }

  /**
   * Maneja el Enter en el textarea
   */
  onEnterPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.enviarMensaje();
    }
  }
}
