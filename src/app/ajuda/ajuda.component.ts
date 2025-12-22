import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-ajuda',
  standalone: true,
  imports: [CommonModule, MatExpansionModule, MatIconModule, MatButtonModule, MatCardModule, MatDividerModule],
  templateUrl: './ajuda.component.html',
  styleUrls: ['./ajuda.component.scss']
})
export class AjudaComponent {
  contactEmail = 'paoquentinho.sac@gmail.com';
  contactSubject = 'Ajuda com o aplicativo Pão Quentinho';

  getMailtoLink(): string {
    const subjectEncoded = encodeURIComponent(this.contactSubject);
    return `mailto:${this.contactEmail}?subject=${subjectEncoded}`;
  }

  resetarApp(): void {
    const confirmacao = confirm(
      'Você tem certeza que deseja reiniciar o aplicativo?\n\n' +
      'Isso limpará todos os dados locais, como preferências do tour, permissões salvas e sessões. ' +
      'O aplicativo será recarregado como se fosse a primeira visita.'
    );

    if (confirmacao) {
      // Limpa o localStorage e sessionStorage
      localStorage.clear();
      sessionStorage.clear();

      // Tenta limpar cookies acessíveis via JS (melhor esforço)
      document.cookie.split(";").forEach((c) => {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });

      // Navega para a raiz para forçar a reinicialização completa do app
      window.location.href = '/';
    }
  }
}
