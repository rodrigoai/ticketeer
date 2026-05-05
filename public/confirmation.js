/**
 * Buyer Confirmation Page JavaScript
 * Handles form validation, CPF validation, API calls, and user interactions
 */

class BuyerConfirmation {
    constructor() {
        this.orderData = null;
        this.hash = this.extractHashFromURL();
        this.validationErrors = {};
        
        // DOM elements
        this.elements = {
            loading: document.getElementById('loading'),
            error: document.getElementById('error'),
            errorMessage: document.getElementById('error-message'),
            completed: document.getElementById('completed'),
            completedInfo: document.getElementById('completed-info'),
            form: document.getElementById('confirmation-form'),
            ticketsContainer: document.getElementById('tickets-container'),
            saveBtn: document.getElementById('save-btn'),
            success: document.getElementById('success'),
            greeting: document.getElementById('greeting')
        };

        this.init();
    }

    async init() {
        if (!this.hash) {
            this.showError('Link inválido. Não foi possível encontrar o código da compra.');
            return;
        }

        try {
            await this.loadOrderData();
            this.renderOrderUI();
        } catch (error) {
            console.error('Initialization error:', error);
            this.showError(error.message);
        }
    }

    extractHashFromURL() {
        const path = window.location.pathname;
        const hashMatch = path.match(/\/confirmation\/([A-Za-z0-9_-]+)$/);
        if (hashMatch) {
            return hashMatch[1];
        }
        
        // Also check URL fragment/hash
        const urlHash = window.location.hash.replace('#', '');
        if (urlHash && this.isValidHashFormat(urlHash)) {
            return urlHash;
        }
        
        return null;
    }

    isValidHashFormat(hash) {
        const base64UrlRegex = /^[A-Za-z0-9_-]+$/;
        return base64UrlRegex.test(hash) && hash.length >= 20 && hash.length <= 60;
    }

    async loadOrderData() {
        try {
            const response = await fetch(`/api/public/orders/${this.hash}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Erro ao carregar informações da compra');
            }

            this.orderData = data.order;
        } catch (error) {
            if (error.message.includes('404') || error.message.includes('not found')) {
                throw new Error('Compra não encontrada. Verifique se o link está correto.');
            }
            throw new Error('Erro ao conectar com o servidor. Tente novamente.');
        }
    }

    renderOrderUI() {
        this.hideAllSections();

        if (this.orderData.isCompleted) {
            this.showCompletedState();
        } else {
            this.showForm();
        }
    }

    hideAllSections() {
        Object.values(this.elements).forEach(element => {
            if (element && element.classList) {
                element.classList.add('hidden');
            }
        });
    }

    showError(message) {
        this.hideAllSections();
        this.elements.error.classList.remove('hidden');
        this.elements.errorMessage.textContent = message;
    }

    showCompletedState() {
        this.elements.completed.classList.remove('hidden');
        this.elements.greeting.textContent = `Olá!`;
        
        // Show masked buyer information
        const infoHTML = this.orderData.tickets.map(ticket => `
            <div class="ticket-completed">
                <strong>Ticket #${ticket.identificationNumber}</strong>
                <div>Nome: ${ticket.buyer}</div>
                <div>CPF: ${ticket.buyerDocument}</div>
                <div>Email: ${ticket.buyerEmail}</div>
            </div>
        `).join('');
        
        this.elements.completedInfo.innerHTML = infoHTML;
    }

    showForm() {
        this.elements.form.classList.remove('hidden');
        this.elements.greeting.textContent = `Olá!`;
        
        // Generate form for each ticket
        this.renderTicketForms();
        this.setupFormValidation();
        this.setupFormSubmission();
    }

    renderTicketForms() {
        const ticketsHTML = this.orderData.tickets.map(ticket => `
            <div class="ticket-item" data-ticket-id="${ticket.id}">
                <div class="ticket-header">
                    <div class="ticket-number">#${ticket.identificationNumber}</div>
                    <div class="ticket-info">
                        ${ticket.description}
                        ${ticket.location ? ` • ${ticket.location}` : ''}
                        ${ticket.table ? ` • Mesa ${ticket.table}` : ''}
                    </div>
                </div>
                
                <div class="ticket-fields">
                    <div class="field-group">
                        <label class="field-label">Nome</label>
                        <input 
                            type="text" 
                            class="field-input" 
                            data-field="name" 
                            data-ticket="${ticket.id}"
                            placeholder="Nome completo"
                            required
                        >
                        <div class="field-error"></div>
                    </div>
                    
                    <div class="field-group">
                        <label class="field-label">Documento</label>
                        <input 
                            type="text" 
                            class="field-input" 
                            data-field="document" 
                            data-ticket="${ticket.id}"
                            data-mask="cpf"
                            placeholder="000.000.000-00"
                            maxlength="14"
                            required
                        >
                        <div class="field-error"></div>
                    </div>
                    
                    <div class="field-group">
                        <label class="field-label">Email</label>
                        <input 
                            type="email" 
                            class="field-input" 
                            data-field="email" 
                            data-ticket="${ticket.id}"
                            placeholder="email@exemplo.com"
                            required
                        >
                        <div class="field-error"></div>
                    </div>
                </div>
            </div>
        `).join('');

        this.elements.ticketsContainer.innerHTML = ticketsHTML;
    }

    setupFormValidation() {
        const inputs = this.elements.form.querySelectorAll('.field-input');
        
        inputs.forEach(input => {
            // CPF mask
            if (input.dataset.mask === 'cpf') {
                input.addEventListener('input', this.handleCPFInput.bind(this));
            }
            
            // Real-time validation
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => this.clearFieldError(input));
            
            // Remove duplicates validation on change
            input.addEventListener('change', () => this.validateUniqueness());
        });
    }

    handleCPFInput(event) {
        const input = event.target;
        let value = input.value.replace(/\D/g, '');
        
        // Apply CPF mask
        if (value.length >= 11) {
            value = value.substring(0, 11);
        }
        
        if (value.length >= 9) {
            value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        } else if (value.length >= 6) {
            value = value.replace(/(\d{3})(\d{3})(\d+)/, '$1.$2.$3');
        } else if (value.length >= 3) {
            value = value.replace(/(\d{3})(\d+)/, '$1.$2');
        }
        
        input.value = value;
    }

    validateField(input) {
        const field = input.dataset.field;
        const value = input.value.trim();
        const ticketId = input.dataset.ticket;
        
        let error = null;

        if (!value) {
            error = 'Campo obrigatório';
        } else {
            switch (field) {
                case 'name':
                    if (value.length < 2) {
                        error = 'Nome deve ter pelo menos 2 caracteres';
                    } else if (!/^[a-zA-ZÀ-ÿ\s]+$/.test(value)) {
                        error = 'Nome deve conter apenas letras';
                    }
                    break;

                case 'document':
                    const cpfValidation = this.validateCPF(value);
                    if (!cpfValidation.isValid) {
                        error = cpfValidation.error;
                    }
                    break;

                case 'email':
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(value)) {
                        error = 'Email inválido';
                    }
                    break;
            }
        }

        this.setFieldError(input, error);
        return !error;
    }

    validateCPF(cpf) {
        const clean = cpf.replace(/\D/g, '');
        
        if (clean.length !== 11) {
            return { isValid: false, error: 'CPF deve ter 11 dígitos' };
        }
        
        if (/^(\d)\1{10}$/.test(clean)) {
            return { isValid: false, error: 'CPF não pode ter todos os dígitos iguais' };
        }
        
        // Calculate verification digits
        let sum = 0;
        for (let i = 0; i < 9; i++) {
            sum += parseInt(clean.charAt(i)) * (10 - i);
        }
        let remainder = sum % 11;
        const firstDigit = remainder < 2 ? 0 : 11 - remainder;
        
        if (firstDigit !== parseInt(clean.charAt(9))) {
            return { isValid: false, error: 'CPF inválido' };
        }
        
        sum = 0;
        for (let i = 0; i < 10; i++) {
            sum += parseInt(clean.charAt(i)) * (11 - i);
        }
        remainder = sum % 11;
        const secondDigit = remainder < 2 ? 0 : 11 - remainder;
        
        if (secondDigit !== parseInt(clean.charAt(10))) {
            return { isValid: false, error: 'CPF inválido' };
        }
        
        return { isValid: true };
    }

    validateUniqueness() {
        const documents = new Set();
        const emails = new Set();
        const documentInputs = this.elements.form.querySelectorAll('[data-field="document"]');
        const emailInputs = this.elements.form.querySelectorAll('[data-field="email"]');
        
        // Check for duplicate CPFs
        documentInputs.forEach(input => {
            const value = input.value.replace(/\D/g, '');
            if (value.length === 11) {
                if (documents.has(value)) {
                    this.setFieldError(input, 'CPF já utilizado em outro ticket');
                } else {
                    documents.add(value);
                }
            }
        });
        
        // Check for duplicate emails
        emailInputs.forEach(input => {
            const value = input.value.trim().toLowerCase();
            if (value && this.validateField(input)) {
                if (emails.has(value)) {
                    this.setFieldError(input, 'Email já utilizado em outro ticket');
                } else {
                    emails.add(value);
                }
            }
        });
    }

    setFieldError(input, error) {
        const fieldGroup = input.closest('.field-group');
        const errorElement = fieldGroup.querySelector('.field-error');
        
        if (error) {
            input.classList.add('error');
            input.classList.remove('success');
            errorElement.textContent = error;
            fieldGroup.classList.add('invalid');
            fieldGroup.classList.remove('valid');
        } else {
            input.classList.remove('error');
            input.classList.add('success');
            errorElement.textContent = '';
            fieldGroup.classList.remove('invalid');
            fieldGroup.classList.add('valid');
        }
        
        this.updateSaveButton();
    }

    clearFieldError(input) {
        const fieldGroup = input.closest('.field-group');
        const errorElement = fieldGroup.querySelector('.field-error');
        
        input.classList.remove('error');
        errorElement.textContent = '';
        fieldGroup.classList.remove('invalid');
        
        this.updateSaveButton();
    }

    updateSaveButton() {
        const allInputs = this.elements.form.querySelectorAll('.field-input');
        const invalidInputs = this.elements.form.querySelectorAll('.field-input.error');
        const emptyRequiredInputs = Array.from(allInputs).filter(input => 
            input.required && !input.value.trim()
        );
        
        const isValid = invalidInputs.length === 0 && emptyRequiredInputs.length === 0;
        this.elements.saveBtn.disabled = !isValid;
    }

    setupFormSubmission() {
        this.elements.form.addEventListener('submit', this.handleFormSubmit.bind(this));
    }

    async handleFormSubmit(event) {
        event.preventDefault();
        
        // Final validation
        const allInputs = this.elements.form.querySelectorAll('.field-input');
        let isValid = true;
        
        allInputs.forEach(input => {
            if (!this.validateField(input)) {
                isValid = false;
            }
        });
        
        this.validateUniqueness();
        
        const errorInputs = this.elements.form.querySelectorAll('.field-input.error');
        if (errorInputs.length > 0) {
            isValid = false;
        }
        
        if (!isValid) {
            alert('Por favor, corrija os erros antes de continuar.');
            return;
        }
        
        // Collect form data
        const buyersData = this.collectFormData();
        
        try {
            this.setLoadingState(true);
            await this.saveBuyersData(buyersData);
            this.showSuccessState();
        } catch (error) {
            console.error('Submit error:', error);
            alert(`Erro ao salvar: ${error.message}`);
            this.setLoadingState(false);
        }
    }

    collectFormData() {
        const buyersData = [];
        
        this.orderData.tickets.forEach(ticket => {
            const nameInput = this.elements.form.querySelector(`[data-field="name"][data-ticket="${ticket.id}"]`);
            const documentInput = this.elements.form.querySelector(`[data-field="document"][data-ticket="${ticket.id}"]`);
            const emailInput = this.elements.form.querySelector(`[data-field="email"][data-ticket="${ticket.id}"]`);
            
            buyersData.push({
                ticketId: ticket.id,
                name: nameInput.value.trim(),
                document: documentInput.value.replace(/\D/g, ''),
                email: emailInput.value.trim().toLowerCase()
            });
        });
        
        return buyersData;
    }

    async saveBuyersData(buyersData) {
        try {
            const response = await fetch(`/api/public/orders/${this.hash}/buyers`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ buyers: buyersData })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Erro ao salvar informações');
            }
            
            return data;
        } catch (error) {
            throw new Error(`Erro de conexão: ${error.message}`);
        }
    }

    setLoadingState(loading) {
        if (loading) {
            this.elements.saveBtn.disabled = true;
            this.elements.saveBtn.classList.add('loading');
            this.elements.form.classList.add('form-loading');
        } else {
            this.elements.saveBtn.disabled = false;
            this.elements.saveBtn.classList.remove('loading');
            this.elements.form.classList.remove('form-loading');
        }
    }

    showSuccessState() {
        this.hideAllSections();
        this.elements.success.classList.remove('hidden');
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new BuyerConfirmation();
});

// Handle browser back/forward buttons
window.addEventListener('popstate', () => {
    location.reload();
});