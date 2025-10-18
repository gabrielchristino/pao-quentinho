import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MapStateService {
  private selectEstablishmentSource = new Subject<number>();

  selectEstablishment$ = this.selectEstablishmentSource.asObservable();

  selectEstablishment(id: number) {
    this.selectEstablishmentSource.next(id);
  }
}