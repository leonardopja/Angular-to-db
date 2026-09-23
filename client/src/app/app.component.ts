import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

type RegistrationResponse = { message: string };
type LoginResponse = { token: string; expiresIn: number; user: { firstName: string; lastName: string; email: string } };

@Component({
    selector: 'app-root',
    imports: [ReactiveFormsModule],
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

    switchMode(mode: 'register' | 'login'): void {
        this.activeMode = mode;
        this.successMessage = '';
        this.serverError = '';
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
                this.isSubmitting = false;
            },
            error: (error) => {
                this.serverError = error.error?.message || 'Unable to sign in.';
                this.isSubmitting = false;
            }
        });
    }

    logout(): void {
        localStorage.removeItem('shiftwork_token');
        this.loggedInUser = '';
        this.activeMode = 'login';
        this.successMessage = '';
        this.serverError = '';
    }
}
