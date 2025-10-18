import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MapStateService {
  // Usamos um Subject normal, pois controlaremos a re-emissão manualmente.
  private selectEstablishmentSource = new Subject<number | null>();

  selectEstablishment$ = this.selectEstablishmentSource.asObservable();

  selectEstablishment(id: number) {
    // Emite null primeiro para "resetar" o estado e garantir que a emissão do ID seja sempre tratada como um novo evento.
    this.selectEstablishmentSource.next(null);
    this.selectEstablishmentSource.next(id);
  }
}