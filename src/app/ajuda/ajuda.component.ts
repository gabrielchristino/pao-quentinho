import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-ajuda',
  standalone: true,
  imports: [CommonModule, MatExpansionModule, MatIconModule, MatButtonModule],
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
}
