import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Plan {
  id: number;
  name: string;
  description: string;
  benefits: string[];
  price: string; // O backend retorna como string, convertemos no frontend se necessário
}

@Injectable({
  providedIn: 'root'
})
export class PlansService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  getPlans(): Observable<Plan[]> {
    return this.http.get<Plan[]>(`${this.apiUrl}/plans`);
  }

  updateUserPlan(planId: number): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/users/me/plan`, { planId });
  }
  
  cancelUserPlan(): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/users/me/plan`, { planId: 0 });
  }
}