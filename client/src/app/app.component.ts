import { DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

type RegistrationResponse = { message: string };
type LoginResponse = { token: string; expiresIn: number; user: { firstName: string; lastName: string; email: string; birthDate: string } };
type Shift = { id?: string; date: string; day: string; month: string; start: string; end: string; rate: number; place: string; name: string };
type ApiShift = { _id: string; date: string; startTime: string; endTime: string; hourlyWage: number; workplace: string; shiftName: string; comments?: string };

@Component({
    selector: 'app-root',
    imports: [DecimalPipe, FormsModule, ReactiveFormsModule],
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss'
})
export class AppComponent {
    private readonly formBuilder = inject(FormBuilder);
    private readonly http = inject(HttpClient);
    isSubmitting = false;
    successMessage = '';
    serverError = '';
    activeMode: 'register' | 'login' = 'register';
    loggedInUser = '';
    activeView: 'home' | 'shifts' | 'add' | 'edit' | 'profile' = 'home';
    shiftPlaceFilter = '';
    shiftDateFilter = '';
    addShiftMessage = '';
    selectedShiftId = '';

    shifts: Shift[] = [
        { date: '2026-06-24', day: '24', month: 'JUN', start: '08:00', end: '14:00', rate: 16, place: 'Northside Cafe', name: 'Morning service shift' },
        { date: '2026-06-27', day: '27', month: 'JUN', start: '16:00', end: '22:00', rate: 18, place: 'Harbor House', name: 'Evening floor shift' },
        { date: '2026-07-02', day: '02', month: 'JUL', start: '09:00', end: '15:00', rate: 16, place: 'Northside Cafe', name: 'Breakfast service shift' },
        { date: '2026-07-05', day: '05', month: 'JUL', start: '12:00', end: '20:00', rate: 20, place: 'The Green Room', name: 'Weekend event shift' }
    ];

    readonly registrationForm = this.formBuilder.nonNullable.group({
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        passwordConfirmation: ['', Validators.required],
        firstName: ['', [Validators.required, Validators.minLength(2)]],
        lastName: ['', [Validators.required, Validators.minLength(2)]],
        birthDate: ['', Validators.required],
        termsAccepted: [false, Validators.requiredTrue]
    });

    readonly loginForm = this.formBuilder.nonNullable.group({
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(6)]]
    });

    readonly addShiftForm = this.formBuilder.nonNullable.group({
        date: ['', Validators.required],
        startTime: ['', Validators.required],
        endTime: ['', Validators.required],
        hourlyWage: [16, [Validators.required, Validators.min(1)]],
        workplace: ['', Validators.required],
        shiftName: ['', [Validators.required, Validators.minLength(2)]],
        comments: ['']
    });

    readonly profileForm = this.formBuilder.nonNullable.group({
        email: ['', [Validators.required, Validators.email]],
        password: ['', Validators.minLength(6)],
        passwordConfirmation: [''],
        firstName: ['', [Validators.required, Validators.minLength(2)]],
        lastName: ['', [Validators.required, Validators.minLength(2)]],
        birthDate: ['', Validators.required]
    });

    get filteredShifts() {
        return this.shifts.filter((shift) => {
            const matchesPlace = !this.shiftPlaceFilter || shift.place === this.shiftPlaceFilter;
            const matchesDate = !this.shiftDateFilter || shift.date >= this.shiftDateFilter;
            return matchesPlace && matchesDate;
        });
    }

    switchMode(mode: 'register' | 'login'): void {
        this.activeMode = mode;
        this.successMessage = '';
        this.serverError = '';
    }

    navigate(view: 'home' | 'shifts' | 'add' | 'edit' | 'profile'): void {
        this.activeView = view;
        this.addShiftMessage = '';
        this.serverError = '';
        if (view === 'profile') this.loadProfile();
    }

    openEditShift(shift: Shift): void {
        if (!shift.id) return;
        this.selectedShiftId = shift.id;
        this.addShiftForm.patchValue({ date: shift.date, startTime: shift.start, endTime: shift.end, hourlyWage: shift.rate, workplace: shift.place, shiftName: shift.name });
        this.navigate('edit');
    }

    get profilePasswordMismatch(): boolean {
        const { password, passwordConfirmation } = this.profileForm.controls;
        return passwordConfirmation.touched && password.value !== passwordConfirmation.value;
    }

    updateProfile(): void {
        this.successMessage = '';
        this.serverError = '';
        this.profileForm.markAllAsTouched();
        if (this.profileForm.invalid || this.profilePasswordMismatch) return;

        this.isSubmitting = true;
        this.http.put<{ message: string; user: LoginResponse['user'] }>('http://localhost:3000/api/me', this.profileForm.getRawValue(), { headers: this.authHeaders() }).subscribe({
            next: (response) => {
                this.loggedInUser = response.user.firstName;
                this.successMessage = response.message;
                this.profileForm.patchValue({ password: '', passwordConfirmation: '' });
                this.isSubmitting = false;
            },
            error: (error) => {
                this.serverError = error.error?.message || 'Unable to update the profile.';
                this.isSubmitting = false;
            }
        });
    }

    saveShift(): void {
        this.addShiftMessage = '';
        this.addShiftForm.markAllAsTouched();
        if (this.addShiftForm.invalid) return;

        this.isSubmitting = true;
        const shiftRequest = this.selectedShiftId
            ? this.http.put<ApiShift>(`http://localhost:3000/api/shifts/${this.selectedShiftId}`, this.addShiftForm.getRawValue(), { headers: this.authHeaders() })
            : this.http.post<ApiShift>('http://localhost:3000/api/shifts', this.addShiftForm.getRawValue(), { headers: this.authHeaders() });
        shiftRequest.subscribe({
            next: (savedShift) => {
                const displayShift = this.toDisplayShift(savedShift);
                if (this.selectedShiftId) {
                    const index = this.shifts.findIndex((shift) => shift.id === this.selectedShiftId);
                    if (index >= 0) this.shifts[index] = displayShift;
                } else {
                    this.shifts.unshift(displayShift);
                }
                this.isSubmitting = false;
                this.addShiftMessage = this.selectedShiftId ? 'Your shift was updated successfully.' : 'Your shift was saved successfully.';
                this.selectedShiftId = '';
                this.addShiftForm.reset({ hourlyWage: 16, comments: '' });
            },
            error: (error) => {
                this.serverError = error.error?.message || 'Unable to save the shift.';
                this.isSubmitting = false;
            }
        });
    }

    get passwordMismatch(): boolean {
        const { password, passwordConfirmation } = this.registrationForm.controls;
        return passwordConfirmation.touched && password.value !== passwordConfirmation.value;
    }

    submitRegistration(): void {
        this.successMessage = '';
        this.serverError = '';
        this.registrationForm.markAllAsTouched();
        if (this.registrationForm.invalid || this.passwordMismatch) return;

        this.isSubmitting = true;
        const { termsAccepted, ...registration } = this.registrationForm.getRawValue();
        this.http.post<RegistrationResponse>('http://localhost:3000/api/auth/register', registration).subscribe({
            next: (response) => {
                this.successMessage = response.message;
                this.registrationForm.reset({ termsAccepted: false });
                this.isSubmitting = false;
            },
            error: (error) => {
                this.serverError = error.error?.message || 'Unable to complete registration.';
                this.isSubmitting = false;
            }
        });
    }

    submitLogin(): void {
        this.successMessage = '';
        this.serverError = '';
        this.loginForm.markAllAsTouched();
        if (this.loginForm.invalid) return;

        this.isSubmitting = true;
        this.http.post<LoginResponse>('http://localhost:3000/api/auth/login', this.loginForm.getRawValue()).subscribe({
            next: (response) => {
                localStorage.setItem('shiftwork_token', response.token);
                this.loggedInUser = response.user.firstName;
                this.successMessage = `Welcome back, ${response.user.firstName}!`;
                this.profileForm.patchValue(response.user);
                this.isSubmitting = false;
                this.loadShifts();
            },
            error: (error) => {
                this.serverError = error.error?.message || 'Unable to sign in.';
                this.isSubmitting = false;
            }
        });
    }

    private loadShifts(): void {
        this.http.get<ApiShift[]>('http://localhost:3000/api/shifts', { headers: this.authHeaders() }).subscribe({
            next: (apiShifts) => this.shifts = apiShifts.map((shift) => this.toDisplayShift(shift)),
            error: (error) => this.serverError = error.error?.message || 'Unable to load shifts.'
        });
    }

    private loadProfile(): void {
        this.http.get<LoginResponse['user']>('http://localhost:3000/api/me', { headers: this.authHeaders() }).subscribe({
            next: (user) => this.profileForm.patchValue(user),
            error: (error) => this.serverError = error.error?.message || 'Unable to load the profile.'
        });
    }

    private authHeaders() {
        return { Authorization: `Bearer ${localStorage.getItem('shiftwork_token') || ''}` };
    }

    private toDisplayShift(shift: ApiShift): Shift {
        const date = new Date(`${shift.date}T00:00:00`);
        return {
            date: shift.date,
            day: date.getDate().toString().padStart(2, '0'),
            month: date.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
            id: shift._id,
            start: shift.startTime,
            end: shift.endTime,
            rate: shift.hourlyWage,
            place: shift.workplace,
            name: shift.shiftName
        };
    }

    logout(): void {
        localStorage.removeItem('shiftwork_token');
        this.loggedInUser = '';
        this.activeView = 'home';
        this.activeMode = 'login';
        this.successMessage = '';
        this.serverError = '';
    }
}
