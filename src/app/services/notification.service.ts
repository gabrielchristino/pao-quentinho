import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly apiUrl = 'https://pao-quentinho-backend-production.up.railway.app/api';

  constructor(private http: HttpClient) { }

  addPushSubscriber(sub: PushSubscription): Observable<any> {
    return this.http.post(`${this.apiUrl}/subscribe`, sub);
  }
}