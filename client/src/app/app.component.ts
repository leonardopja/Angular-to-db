import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

type RegistrationResponse = { message: string };

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

    readonly registrationForm = this.formBuilder.nonNullable.group({
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        passwordConfirmation: ['', Validators.required],
        firstName: ['', [Validators.required, Validators.minLength(2)]],
        lastName: ['', [Validators.required, Validators.minLength(2)]],
        birthDate: ['', Validators.required],
        termsAccepted: [false, Validators.requiredTrue]
    });

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
}
