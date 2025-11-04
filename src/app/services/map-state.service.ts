import { Injectable } from '@angular/core';
import { ReplaySubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MapStateService {
  // ReplaySubject(1) guarda o último ID emitido e o entrega para qualquer novo inscrito.
  private selectEstablishmentSource = new ReplaySubject<number>(1);

  selectEstablishment$ = this.selectEstablishmentSource.asObservable();

  selectEstablishment(id: number) {
    this.selectEstablishmentSource.next(id);
  }

  clearSelection(): void {
    this.selectEstablishmentSource.next(null as any);
  }
}