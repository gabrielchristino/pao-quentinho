import { Injectable } from '@angular/core';
import { ReplaySubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MapStateService {
  // Usamos ReplaySubject(1) para guardar e re-emitir o último ID para novos inscritos.
  private selectEstablishmentSource = new ReplaySubject<number>(1);

  selectEstablishment$ = this.selectEstablishmentSource.asObservable();

  selectEstablishment(id: number) {
    this.selectEstablishmentSource.next(id);
  }
}